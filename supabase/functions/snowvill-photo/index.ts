// snowvill-photo — private photo handling for Snow Village (shared mkideabox-games project).
//
// Actions (POST):
//   view            JSON {install_id, village_id, house_id}         → {url}   2-minute signed URL
//   upload          multipart {install_id, house_id, secret, file}  → {ok}    resident only, JPEG ≤300KB/≤1024px, metadata stripped
//   remove          JSON {install_id, house_id, secret}             → {ok}    resident or village owner; deletes row + photo
//   delete_village  JSON {install_id, village_id, secret}           → {ok}    village owner; deletes everything + photos
// The bucket has no storage policies; only this function (service role) reads or writes it.
import { sanitizeJpeg } from "./jpeg.ts";

const URL_BASE = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "snowvill-photos";
const MAX_BYTES = 300 * 1024;
const MAX_SIDE = 1024;
const SIGNED_URL_SECONDS = 120;
const ALLOWED_ORIGINS = (Deno.env.get("SNOWVILL_ALLOWED_ORIGINS") ?? "http://localhost:3000,http://localhost:3100")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VILLAGE_RE = /^[a-km-z2-9]{10}$/;

class HttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

function cors(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] ?? "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}

const serviceHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${URL_BASE}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { ...serviceHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 429 || text.includes("PT429")) throw new HttpError(429, "RATE_LIMITED");
    if (res.status === 400) throw new HttpError(400, "INVALID_INPUT");
    console.error("rpc failed", fn, res.status);
    throw new HttpError(500, "SERVER_ERROR");
  }
  return (text ? JSON.parse(text) : null) as T;
}

async function removeObjects(paths: string[]) {
  const list = paths.filter(Boolean);
  if (list.length === 0) return;
  const res = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: { ...serviceHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: list }),
  });
  if (!res.ok) console.error("storage delete failed", res.status);
}

function str(v: unknown, re: RegExp, code = "INVALID_INPUT"): string {
  if (typeof v !== "string" || !re.test(v)) throw new HttpError(400, code);
  return v;
}
const secretOf = (v: unknown) => str(v, /^[A-Za-z0-9_-]{32}$/, "FORBIDDEN");

async function rateLimit(installId: string, action: string, perMinute: number, perDay: number) {
  await rpc("snowvill_rate_limit", { p_install_id: installId, p_action: action, p_per_minute: perMinute, p_per_day: perDay });
}

type HouseAccess = { village_id: string; photo_path: string | null; role: "resident" | "owner" | null } | null;

async function view(body: Record<string, unknown>) {
  const installId = str(body.install_id, UUID_RE);
  const villageId = str(body.village_id, VILLAGE_RE);
  const houseId = str(body.house_id, UUID_RE);
  await rateLimit(installId, "photo_view", 60, 2000);
  const path = await rpc<string | null>("snowvill_photo_path", { p_village_id: villageId, p_house_id: houseId });
  if (!path) throw new HttpError(404, "NO_PHOTO");
  const res = await fetch(`${URL_BASE}/storage/v1/object/sign/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...serviceHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: SIGNED_URL_SECONDS }),
  });
  if (!res.ok) throw new HttpError(404, "NO_PHOTO");
  const { signedURL } = await res.json();
  return { url: `${URL_BASE}/storage/v1${signedURL}`, expires_in: SIGNED_URL_SECONDS };
}

async function upload(req: Request) {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > MAX_BYTES + 4096) throw new HttpError(413, "TOO_LARGE");
  const form = await req.formData();
  const installId = str(form.get("install_id"), UUID_RE);
  const houseId = str(form.get("house_id"), UUID_RE);
  const secret = secretOf(form.get("secret"));
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "INVALID_INPUT");
  if (file.size > MAX_BYTES) throw new HttpError(413, "TOO_LARGE");
  await rateLimit(installId, "photo_upload", 6, 40);

  const access = await rpc<HouseAccess>("snowvill_house_access", { p_house_id: houseId, p_secret: secret });
  if (!access) throw new HttpError(404, "NOT_FOUND");
  if (access.role !== "resident") throw new HttpError(403, "FORBIDDEN");

  const clean = sanitizeJpeg(new Uint8Array(await file.arrayBuffer()));
  if (!clean) throw new HttpError(415, "UNSUPPORTED");
  if (clean.width > MAX_SIDE || clean.height > MAX_SIDE) throw new HttpError(400, "TOO_MANY_PIXELS");

  const path = `${access.village_id}/${houseId}/${crypto.randomUUID()}.jpg`;
  const put = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...serviceHeaders, "Content-Type": "image/jpeg", "x-upsert": "false", "cache-control": "max-age=3600" },
    body: new Blob([clean.bytes as Uint8Array<ArrayBuffer>], { type: "image/jpeg" }),
  });
  if (!put.ok) {
    console.error("storage upload failed", put.status);
    throw new HttpError(502, "UPLOAD_FAILED");
  }
  const previous = await rpc<string | null>("snowvill_set_photo", { p_house_id: houseId, p_path: path });
  if (previous) await removeObjects([previous]);
  return { ok: true, width: clean.width, height: clean.height };
}

async function removeHouse(body: Record<string, unknown>) {
  const installId = str(body.install_id, UUID_RE);
  const houseId = str(body.house_id, UUID_RE);
  const secret = secretOf(body.secret);
  await rateLimit(installId, "remove", 10, 100);
  const access = await rpc<HouseAccess>("snowvill_house_access", { p_house_id: houseId, p_secret: secret });
  if (!access) throw new HttpError(404, "NOT_FOUND");
  if (!access.role) throw new HttpError(403, "FORBIDDEN");
  const path = await rpc<string | null>("snowvill_delete_house", { p_house_id: houseId });
  if (path) await removeObjects([path]);
  return { ok: true };
}

async function deleteVillage(body: Record<string, unknown>) {
  const installId = str(body.install_id, UUID_RE);
  const villageId = str(body.village_id, VILLAGE_RE);
  const secret = secretOf(body.secret);
  await rateLimit(installId, "delete_village", 3, 20);
  const allowed = await rpc<boolean>("snowvill_village_access", { p_village_id: villageId, p_secret: secret });
  if (!allowed) throw new HttpError(403, "FORBIDDEN");
  const paths = await rpc<string[]>("snowvill_delete_village", { p_village_id: villageId });
  await removeObjects(paths ?? []);
  return { ok: true };
}

Deno.serve(async (req) => {
  const headers = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  const json = (status: number, data: unknown) =>
    new Response(JSON.stringify(data), { status, headers: { ...headers, "Content-Type": "application/json" } });
  if (req.method !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });

  try {
    const type = req.headers.get("content-type") ?? "";
    if (type.startsWith("multipart/form-data")) return json(200, await upload(req));
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") throw new HttpError(400, "INVALID_INPUT");
    switch (body.action) {
      case "view":
        return json(200, await view(body));
      case "remove":
        return json(200, await removeHouse(body));
      case "delete_village":
        return json(200, await deleteVillage(body));
      default:
        throw new HttpError(400, "UNKNOWN_ACTION");
    }
  } catch (err) {
    if (err instanceof HttpError) return json(err.status, { error: err.code });
    console.error("unhandled", err instanceof Error ? err.message : "unknown");
    return json(500, { error: "SERVER_ERROR" });
  }
});
