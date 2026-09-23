import { createReadStream, createWriteStream } from "node:fs";
import { open, stat, unlink } from "node:fs/promises";
import { privateDecrypt, createDecipheriv, constants } from "node:crypto";
import { pipeline } from "node:stream/promises";
const [input, output] = process.argv.slice(2);
if (!input || !output || !process.env.ARBAHARA_BACKUP_PRIVATE_KEY)
  throw new Error(
    "Usage: set ARBAHARA_BACKUP_PRIVATE_KEY securely, then node scripts/decrypt-backup.mjs input.arb output.zip",
  );
const file = await open(input, "r");
const prefix = Buffer.alloc(12);
await file.read(prefix, 0, 12, 0);
if (prefix.subarray(0, 8).toString() !== "ARBBAK01")
  throw new Error("Unknown backup format.");
const size = prefix.readUInt32BE(8);
if (size > 65536) throw new Error("Invalid backup header.");
const metadata = Buffer.alloc(size);
await file.read(metadata, 0, size, 12);
const info = JSON.parse(metadata.toString());
const total = (await stat(input)).size;
const tag = Buffer.alloc(16);
await file.read(tag, 0, 16, total - 16);
await file.close();
const key = privateDecrypt(
  {
    key: process.env.ARBAHARA_BACKUP_PRIVATE_KEY,
    oaepHash: "sha256",
    padding: constants.RSA_PKCS1_OAEP_PADDING,
  },
  Buffer.from(info.encryptedKey, "base64"),
);
const decipher = createDecipheriv(
  "aes-256-gcm",
  key,
  Buffer.from(info.iv, "base64"),
);
decipher.setAAD(metadata);
decipher.setAuthTag(tag);
let created = false;
const dest = createWriteStream(output, { flags: "wx", mode: 0o600 });
dest.on("open", () => {
  created = true;
});
try {
  await pipeline(
    createReadStream(input, { start: 12 + size, end: total - 17 }),
    decipher,
    dest,
  );
} catch (e) {
  if (created) await unlink(output);
  throw e;
} finally {
  key.fill(0);
}
console.log(`Backup authenticated and decrypted: ${output}`);
