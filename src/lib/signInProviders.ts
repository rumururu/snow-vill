/**
 * Browser sign-in SDKs: Google Identity Services and Sign in with Apple JS.
 * Both return an ID token; the raw nonce goes to Supabase, its SHA-256 to Google / Apple.
 */
import { randomNonce, sha256Hex } from "./auth";

export const GOOGLE_WEB_CLIENT_ID = "326320694955-6ltlbk16iv6knc29agfmjevp6bopa8oi.apps.googleusercontent.com";
const GOOGLE_SCRIPT = "https://accounts.google.com/gsi/client";
export const APPLE_CLIENT_ID = "com.mkideabox.snowvillage.web";
export const APPLE_REDIRECT_URI = "https://snow.mkideabox.com/";
const APPLE_SCRIPT = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
/** The Apple Services ID only lists this domain. */
export const APPLE_HOST = "snow.mkideabox.com";

interface GoogleId {
  initialize(opts: Record<string, unknown>): void;
  renderButton(el: HTMLElement, opts: Record<string, unknown>): void;
}
interface AppleAuth {
  init(opts: Record<string, unknown>): void;
  signIn(): Promise<{ authorization?: { code?: string; id_token?: string } }>;
}
declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
    AppleID?: { auth?: AppleAuth };
  }
}

const loading = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const existing = loading.get(src);
  if (existing) return existing;
  const p = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      loading.delete(src);
      el.remove();
      reject(new Error("script"));
    };
    document.head.appendChild(el);
  });
  loading.set(src, p);
  return p;
}

export function appleAvailable(): boolean {
  return typeof window !== "undefined" && window.location.hostname === APPLE_HOST;
}

export interface IdTokenResult {
  idToken: string;
  nonce: string;
}

/**
 * Renders Google's own button into `el`. `onToken` runs after the user picks an account.
 * Returns once the button is on screen.
 */
export async function renderGoogleButton(
  el: HTMLElement,
  opts: { locale: string; width: number; onToken: (r: IdTokenResult) => void },
): Promise<void> {
  await loadScript(GOOGLE_SCRIPT);
  const gid = window.google?.accounts?.id;
  if (!gid) throw new Error("gsi");
  const nonce = randomNonce();
  gid.initialize({
    client_id: GOOGLE_WEB_CLIENT_ID,
    nonce: await sha256Hex(nonce),
    use_fedcm_for_button: true,
    callback: (res: { credential?: string }) => {
      if (res.credential) opts.onToken({ idToken: res.credential, nonce });
    },
  });
  el.replaceChildren();
  gid.renderButton(el, {
    type: "standard",
    theme: "outline",
    size: "large",
    shape: "pill",
    text: "continue_with",
    logo_alignment: "center",
    locale: opts.locale,
    width: Math.max(200, Math.min(400, Math.round(opts.width))),
  });
}

let applePrepared: { nonce: string; hashed: string } | null = null;

/**
 * Loads Sign in with Apple JS and a hashed nonce ahead of the click: the popup has to open straight
 * from the click (Safari blocks popups opened after an await).
 */
export async function preloadApple(): Promise<void> {
  await loadScript(APPLE_SCRIPT);
  if (!applePrepared) {
    const nonce = randomNonce();
    applePrepared = { nonce, hashed: await sha256Hex(nonce) };
  }
}

/** Opens the Apple popup. Resolves with the ID token and a fresh authorization code. */
export async function appleSignIn(): Promise<IdTokenResult & { code: string | null }> {
  let prepared = applePrepared;
  if (!prepared || !window.AppleID?.auth) {
    await preloadApple();
    prepared = applePrepared;
  }
  const auth = window.AppleID?.auth;
  if (!auth || !prepared) throw new Error("apple");
  applePrepared = null; // one nonce per sign-in
  auth.init({
    clientId: APPLE_CLIENT_ID,
    scope: "name email",
    redirectURI: APPLE_REDIRECT_URI,
    usePopup: true,
    nonce: prepared.hashed,
  });
  const res = await auth.signIn();
  void preloadApple().catch(() => undefined);
  const idToken = res.authorization?.id_token;
  if (!idToken) throw new Error("apple");
  return { idToken, nonce: prepared.nonce, code: res.authorization?.code ?? null };
}
