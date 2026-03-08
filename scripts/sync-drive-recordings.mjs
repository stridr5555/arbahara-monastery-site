#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import crypto from 'crypto';

const rootDir = process.cwd();
const rawDir = path.join(rootDir, 'assets/audio/raw');

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...options });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

async function getAccessToken() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!clientEmail || !privateKey) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL/PRIVATE_KEY');

  privateKey = privateKey.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).end().sign(privateKey, 'base64url');
  const assertion = `${unsigned}.${signature}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function listMp3Files(accessToken, folderId) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false and mimeType='audio/mpeg'`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,size,modifiedTime)&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=1000`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Drive list error: ${JSON.stringify(data)}`);
  return data.files || [];
}

async function downloadFile(accessToken, fileId, outPath) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Drive download failed: ${txt}`);
  }
  const arr = Buffer.from(await resp.arrayBuffer());
  await fs.writeFile(outPath, arr);
}

async function main() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) throw new Error('Missing GOOGLE_DRIVE_FOLDER_ID');

  await fs.mkdir(rawDir, { recursive: true });

  const accessToken = await getAccessToken();
  const files = await listMp3Files(accessToken, folderId);

  if (!files.length) {
    console.log('No MP3 files found in Drive folder.');
    return;
  }

  let downloaded = 0;
  for (const file of files) {
    const outPath = path.join(rawDir, file.name);
    await downloadFile(accessToken, file.id, outPath);
    downloaded += 1;
    console.log(`Downloaded ${file.name}`);
  }

  console.log(`Downloaded ${downloaded} file(s). Running processing pipeline...`);
  await run('node', ['scripts/process-meeting-recordings.mjs'], { cwd: rootDir });

  if (process.argv.includes('--commit')) {
    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    await run('git', ['add', 'assets/audio/raw', 'assets/audio/processed'], { cwd: rootDir });
    await run('git', ['commit', '-m', `Sync Drive recordings + process (${stamp})`], { cwd: rootDir });
    await run('git', ['push', 'origin', 'main'], { cwd: rootDir });
    console.log('Committed and pushed to GitHub.');
  } else {
    console.log('Sync complete. Run with --commit to publish to GitHub.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
