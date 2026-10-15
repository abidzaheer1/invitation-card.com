"use client";

/** Google Identity Services: the "Continue with Google" button. The script comes from Google. */

interface GoogleId {
  initialize: (config: { client_id: string; callback: (r: { credential: string }) => void }) => void;
  renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let script: Promise<void> | null = null;
function loadGoogleScript(): Promise<void> {
  script ??= new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      script = null;
      reject(new Error("Google sign-in could not load"));
    };
    document.head.appendChild(s);
  });
  return script;
}

/** Draws Google's button into `el`. Resolves false if Google's script could not be loaded. */
export async function renderGoogleButton(
  el: HTMLElement,
  clientId: string,
  onCredential: (credential: string) => void,
  text: "continue_with" | "signin_with" = "continue_with",
): Promise<boolean> {
  try {
    await loadGoogleScript();
  } catch {
    return false;
  }
  if (!window.google) return false;
  window.google.accounts.id.initialize({ client_id: clientId, callback: ({ credential }) => onCredential(credential) });
  window.google.accounts.id.renderButton(el, { theme: "outline", size: "large", text, shape: "rectangular", width: 320 });
  return true;
}
