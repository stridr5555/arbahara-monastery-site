import type { BankDetails } from "../../convex/achValidation";
function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
/** Bank numbers stay out of request arguments, logs, URLs and browser storage. */
export async function encryptBankDetails(
  details: BankDetails,
  publicJwk: JsonWebKey,
  context: string,
) {
  if (!globalThis.crypto?.subtle)
    throw new Error(
      "Secure bank entry requires an up-to-date browser on HTTPS.",
    );
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    publicJwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(details));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(context) },
    key,
    data,
  );
  const wrappedKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    await crypto.subtle.exportKey("raw", key),
  );
  data.fill(0);
  return {
    wrappedKey: base64url(new Uint8Array(wrappedKey)),
    iv: base64url(iv),
    ciphertext: base64url(new Uint8Array(ciphertext)),
  };
}
