const container = document.getElementById('recordings-container');

function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function renderRecordings(items) {
  container.innerHTML = '';

  if (!items.length) {
    container.innerHTML = '<p>No recordings published yet.</p>';
    return;
  }

  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'card recordings-card';

    const title = document.createElement('h3');
    title.textContent = item.displayDate || item.date;

    const meta = document.createElement('p');
    meta.textContent = `${formatDuration(item.durationSeconds)} • ${item.sourceCount} source file(s)`;

    const audio = document.createElement('audio');
    audio.controls = true;
    audio.preload = 'none';
    audio.src = item.path;

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(audio);
    container.appendChild(card);
  });
}

async function init() {
  try {
    const response = await fetch('/assets/audio/processed/manifest.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Manifest not found yet');
    }
    const manifest = await response.json();
    renderRecordings(manifest.recordings || []);
  } catch (error) {
    container.innerHTML = `<p>${error.message}</p>`;
  }
}

init();
