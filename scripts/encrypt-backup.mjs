import { createReadStream, createWriteStream } from "node:fs";
import { readFile, appendFile, stat } from "node:fs/promises";
import {
  randomBytes,
  publicEncrypt,
  createCipheriv,
  constants,
} from "node:crypto";
import { pipeline } from "node:stream/promises";

const [input, output, publicKeyFile] = process.argv.slice(2);
if (!input || !output || !publicKeyFile)
  throw new Error(
    "Usage: node scripts/encrypt-backup.mjs input.zip output.arb public-key.pem",
  );
if ((await stat(input)).size > 100 * 1024 * 1024)
  throw new Error(
    "Snapshot exceeds the 100 MB artifact limit. Configure approved archival storage before increasing this limit.",
  );
const key = randomBytes(32),
  iv = randomBytes(12);
const encryptedKey = publicEncrypt(
  {
    key: await readFile(publicKeyFile, "utf8"),
    oaepHash: "sha256",
    padding: constants.RSA_PKCS1_OAEP_PADDING,
  },
  key,
);
const metadata = Buffer.from(
  JSON.stringify({
    version: 1,
    algorithm: "RSA-OAEP-SHA256/AES-256-GCM",
    createdAt: new Date().toISOString(),
    iv: iv.toString("base64"),
    encryptedKey: encryptedKey.toString("base64"),
  }),
);
const length = Buffer.alloc(4);
length.writeUInt32BE(metadata.length);
const outputStream = createWriteStream(output, { flags: "wx", mode: 0o600 });
outputStream.write(Buffer.concat([Buffer.from("ARBBAK01"), length, metadata]));
const cipher = createCipheriv("aes-256-gcm", key, iv);
cipher.setAAD(metadata);
await pipeline(createReadStream(input), cipher, outputStream);
await appendFile(output, cipher.getAuthTag());
key.fill(0);
console.log(`Encrypted backup created: ${output}`);
