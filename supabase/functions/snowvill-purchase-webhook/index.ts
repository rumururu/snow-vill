// RevenueCat → Snow Village big-village wallet (migrations/20261110100000_snowvill_big_village.sql).
// Same shape as the company's ldm/cspace webhooks. verify_jwt off (RevenueCat sends its own header);
// the Authorization header must equal the secret SNOWVILL_WEBHOOK_AUTH (keychain snowvill-webhook-auth /
// service supabase). The app's RevenueCat app user id is its install id (UUID); anything else is ignored.
//
//   NON_RENEWING_PURCHASE / INITIAL_PURCHASE → snowvill_credit_purchase (once per transaction)
//   CANCELLATION of a one-time purchase (refund) → snowvill_refund_purchase (down to zero credits, once)
//   TRANSFER (restore under another app user id) → snowvill_transfer
const URL_BASE = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuids = (xs: unknown): string[] => (Array.isArray(xs) ? xs : []).filter((x) => typeof x === "string" && UUID.test(x));
const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);

async function rpc(fn: string, args: Record<string, unknown>) {
  const res = await fetch(`${URL_BASE}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  const expected = Deno.env.get("SNOWVILL_WEBHOOK_AUTH");
  if (!expected || req.headers.get("authorization") !== expected) return new Response("unauthorized", { status: 401 });

  let payload: { event?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }
  // deno-lint-ignore no-explicit-any -- untyped third-party payload, every field is validated before use
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = (payload?.event ?? {}) as Record<string, any>;
  // The purchase may arrive under the anonymous RevenueCat id first: prefer an install-id alias.
  const wallet = uuids([e.app_user_id, ...(e.aliases ?? []), e.original_app_user_id])[0];

  if (e.type === "NON_RENEWING_PURCHASE" || e.type === "INITIAL_PURCHASE") {
    if (!wallet) return Response.json({ ignored: "no install id" });
    const r = await rpc("snowvill_credit_purchase", {
      p_install_id: wallet,
      p_transaction_id: e.transaction_id ?? e.id,
      p_product_id: e.product_id,
      // RevenueCat `price` is USD; `price_in_purchased_currency` goes with `currency`.
      p_price: num(e.price_in_purchased_currency),
      p_price_usd: num(e.price),
      p_currency: e.currency ?? null,
      p_store: e.store ?? null,
      p_environment: e.environment ?? null,
    });
    if (!r.ok) {
      console.error("credit failed", r.status);
      return new Response("credit failed", { status: 500 }); // RevenueCat retries
    }
    return Response.json(r.data);
  }
  if (e.type === "CANCELLATION" && (e.cancel_reason === "CUSTOMER_SUPPORT" || e.cancel_reason === "REFUND" || e.store === "PLAY_STORE")) {
    const r = await rpc("snowvill_refund_purchase", { p_transaction_id: e.transaction_id ?? e.id });
    if (!r.ok) return new Response("refund failed", { status: 500 });
    return Response.json(r.data);
  }
  if (e.type === "TRANSFER") {
    const to = uuids(e.transferred_to)[0];
    const from = uuids(e.transferred_from);
    if (!to || from.length === 0) return Response.json({ ignored: "no install ids" });
    const r = await rpc("snowvill_transfer", { p_from: from, p_to: to });
    if (!r.ok) return new Response("transfer failed", { status: 500 });
    return Response.json(r.data);
  }
  return Response.json({ ignored: e.type ?? "unknown" });
});
