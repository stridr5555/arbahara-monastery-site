import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile('assets/videos/manifest.json','utf8'));
for(const video of manifest.videos){const file=video.path.replace(/^\//,'');const info=await stat(file);if(info.size!==video.bytes)throw new Error(`Video bytes are missing or this is a Git LFS pointer: ${file}. Enable Git LFS checkout.`);const hash=createHash('sha256').update(await readFile(file)).digest('hex');if(hash!==video.sha256)throw new Error(`Video checksum mismatch: ${file}`);}
console.log(`Media integrity passed: ${manifest.videos.length} full video files, sizes and SHA-256 hashes verified.`);
