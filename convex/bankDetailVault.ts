"use node";
import {
  createPrivateKey,
  createPublicKey,
  createHash,
  privateDecrypt,
  createDecipheriv,
  constants,
} from "node:crypto";
export function bankDetailKey() {
  const raw = process.env.BANK_DETAILS_PRIVATE_KEY;
  if (process.env.BANK_DETAILS_ENABLED !== "true" || !raw)
    throw new Error(
      "Secure bank-detail intake is not configured. Contact the office; do not email bank numbers.",
    );
  const privateKey = createPrivateKey(raw.replace(/\\n/g, "\n"));
  if (
    privateKey.asymmetricKeyType !== "rsa" ||
    (privateKey.asymmetricKeyDetails?.modulusLength || 0) < 3072
  )
    throw new Error("Bank-detail encryption configuration needs attention.");
  const publicKey = createPublicKey(privateKey);
  const keyId = createHash("sha256")
    .update(publicKey.export({ type: "spki", format: "der" }))
    .digest("hex");
  return { privateKey, publicJwk: publicKey.export({ format: "jwk" }), keyId };
}
export function decryptBankEnvelope(
  envelope: { wrappedKey: string; iv: string; ciphertext: string },
  context: string,
) {
  for (const [field, max] of [
    ["wrappedKey", 700],
    ["iv", 24],
    ["ciphertext", 12000],
  ] as const)
    if (
      typeof envelope[field] !== "string" ||
      !/^[A-Za-z0-9_-]+$/.test(envelope[field]) ||
      envelope[field].length > max
    )
      throw new Error("The encrypted request is invalid. Please start again.");
  const { privateKey } = bankDetailKey();
  const key = privateDecrypt(
    {
      key: privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(envelope.wrappedKey, "base64url"),
  );
  const iv = Buffer.from(envelope.iv, "base64url");
  const combined = Buffer.from(envelope.ciphertext, "base64url");
  if (key.length !== 32 || iv.length !== 12 || combined.length < 17)
    throw new Error("Invalid encrypted request.");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(combined.subarray(-16));
  return JSON.parse(
    Buffer.concat([
      decipher.update(combined.subarray(0, -16)),
      decipher.final(),
    ]).toString("utf8"),
  ) as unknown;
}
