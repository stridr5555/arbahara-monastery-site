#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

const rootDir = process.cwd();
const rawDir = path.join(rootDir, 'assets/audio/raw');
const outDir = path.join(rootDir, 'assets/audio/processed');
const tmpDir = path.join(rootDir, 'assets/audio/.tmp-processing');

const SILENCE_TRIM_FILTER =
  'silenceremove=start_periods=1:start_duration=0.25:start_threshold=-40dB:stop_periods=1:stop_duration=0.4:stop_threshold=-40dB';

const MIN_DURATION_SECONDS = 20;

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${cmd} failed (${code})\n${stderr || stdout}`));
      }
    });
  });
}

function parseRecordingName(filename) {
  const base = path.basename(filename, path.extname(filename));
  const normalized = base.replace(/_/g, ' ').trim();

  const dateMatch = normalized.match(/(\d{4})[- ]?(\d{2})[- ]?(\d{2})/);
  if (!dateMatch) return null;

  const year = dateMatch[1];
  const month = dateMatch[2];
  const day = dateMatch[3];
  const date = `${year}-${month}-${day}`;

  const sequenceMatch = normalized.match(/#\s*(\d+)/i);
  const sequence = sequenceMatch ? Number(sequenceMatch[1]) : 1;

  return { date, sequence };
}

async function probeDuration(filePath) {
  const { stdout } = await run('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);

  const duration = Number.parseFloat(stdout.trim());
  return Number.isFinite(duration) ? duration : 0;
}

async function ensureDirs() {
  await fs.mkdir(rawDir, { recursive: true });
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(tmpDir, { recursive: true });
}

async function listRawMp3Files() {
  const entries = await fs.readdir(rawDir, { withFileTypes: true });
  return entries
    .filter((d) => d.isFile() && d.name.toLowerCase().endsWith('.mp3'))
    .map((d) => path.join(rawDir, d.name));
}

async function trimSilence(inputPath, trimmedPath) {
  await run('ffmpeg', [
    '-y',
    '-i',
    inputPath,
    '-af',
    SILENCE_TRIM_FILTER,
    '-c:a',
    'libmp3lame',
    '-q:a',
    '3',
    trimmedPath,
  ]);
}

function dateToDisplay(dateIso) {
  const dt = new Date(`${dateIso}T12:00:00Z`);
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

async function processAll() {
  await ensureDirs();

  const rawFiles = await listRawMp3Files();
  if (!rawFiles.length) {
    const emptyManifest = {
      generatedAt: new Date().toISOString(),
      recordings: [],
      skipped: [],
    };
    await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(emptyManifest, null, 2));
    console.log('No raw MP3 files found. Wrote empty manifest.');
    return;
  }

  const accepted = [];
  const skipped = [];

  for (const rawPath of rawFiles) {
    const name = path.basename(rawPath);
    const parsed = parseRecordingName(name);
    if (!parsed) {
      skipped.push({ file: name, reason: 'No parseable date in filename' });
      continue;
    }

    const trimmedPath = path.join(tmpDir, `${path.basename(name, '.mp3')}.trimmed.mp3`);

    try {
      await trimSilence(rawPath, trimmedPath);
      const duration = await probeDuration(trimmedPath);

      if (duration < MIN_DURATION_SECONDS) {
        skipped.push({ file: name, reason: `Near-empty after trim (${duration.toFixed(1)}s)` });
        continue;
      }

      accepted.push({
        originalPath: rawPath,
        trimmedPath,
        file: name,
        date: parsed.date,
        sequence: parsed.sequence,
        duration,
      });
    } catch (error) {
      skipped.push({ file: name, reason: `Trim failed: ${error.message}` });
    }
  }

  const grouped = new Map();
  for (const item of accepted) {
    if (!grouped.has(item.date)) grouped.set(item.date, []);
    grouped.get(item.date).push(item);
  }

  const recordings = [];

  for (const [date, items] of grouped.entries()) {
    items.sort((a, b) => a.sequence - b.sequence || a.file.localeCompare(b.file));

    const concatListPath = path.join(tmpDir, `${date}.concat.txt`);
    const concatLines = items.map((item) => `file '${item.trimmedPath.replace(/'/g, "'\\''")}'`).join('\n');
    await fs.writeFile(concatListPath, `${concatLines}\n`, 'utf8');

    const outputFileName = `${date}.mp3`;
    const outputPath = path.join(outDir, outputFileName);

    await run('ffmpeg', [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatListPath,
      '-c:a',
      'libmp3lame',
      '-q:a',
      '3',
      outputPath,
    ]);

    const mergedDuration = await probeDuration(outputPath);

    recordings.push({
      date,
      displayDate: dateToDisplay(date),
      path: `/assets/audio/processed/${outputFileName}`,
      durationSeconds: Number(mergedDuration.toFixed(2)),
      sourceCount: items.length,
      sources: items.map((i) => i.file),
    });
  }

  recordings.sort((a, b) => b.date.localeCompare(a.date));

  const referencedOutputs = new Set(recordings.map((r) => path.basename(r.path)));
  const outEntries = await fs.readdir(outDir, { withFileTypes: true });
  await Promise.all(
    outEntries
      .filter((d) => d.isFile() && d.name.toLowerCase().endsWith('.mp3') && !referencedOutputs.has(d.name))
      .map((d) => fs.unlink(path.join(outDir, d.name)))
  );

  const manifest = {
    generatedAt: new Date().toISOString(),
    recordings,
    skipped,
  };

  await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`Processed ${accepted.length} clips into ${recordings.length} date recording(s).`);
  console.log(`Skipped ${skipped.length} clip(s).`);
}

processAll().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
