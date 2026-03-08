const storageKey = 'arbahara_admin_token';
const googleTokenKey = 'arbahara_google_access_token';
const MAX_SINGLE_FILE_MB = 500;

const loginForm = document.getElementById('admin-login-form');
const passwordInput = document.getElementById('admin-password');
const loginStatus = document.getElementById('login-status');

const googleConnectButton = document.getElementById('google-connect');
const googleStatus = document.getElementById('google-status');

const uploadForm = document.getElementById('upload-form');
const filesInput = document.getElementById('recording-files');
const uploadStatus = document.getElementById('upload-status');
const uploadResults = document.getElementById('upload-results');

const titleForm = document.getElementById('title-form');
const saveTitlesButton = document.getElementById('save-titles');
const titleStatus = document.getElementById('title-status');

function setStatus(el, text, isError = false) {
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? '#b42318' : '#1f6f43';
}

function getToken() {
  return localStorage.getItem(storageKey) || '';
}

function setToken(token) {
  localStorage.setItem(storageKey, token);
}

function getGoogleAccessToken() {
  return localStorage.getItem(googleTokenKey) || '';
}

function setGoogleAccessToken(token) {
  localStorage.setItem(googleTokenKey, token);
}

function clearResults() {
  uploadResults.innerHTML = '';
}

function addResult(text) {
  const li = document.createElement('li');
  li.textContent = text;
  uploadResults.appendChild(li);
}

function updateGoogleStatus() {
  if (getGoogleAccessToken()) {
    setStatus(googleStatus, 'Google Drive connected.');
  } else {
    setStatus(googleStatus, 'Google Drive not connected yet.', true);
  }
}

async function initDriveUpload({ token, file, googleAccessToken }) {
  const response = await fetch('/api/drive-upload-init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      filename: file.name,
      contentType: file.type || 'audio/mpeg',
      sizeBytes: file.size,
      googleAccessToken,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.detail || data?.error || 'Drive init failed');
  }

  return data;
}

async function uploadToDriveResumable(uploadUrl, file) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'audio/mpeg',
    },
    body: file,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Drive upload failed (${response.status}): ${text.slice(0, 200)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return { ok: true };
  }
}

async function loadTitleEditor() {
  if (!titleForm) return;

  titleForm.innerHTML = '<p>Loading recordings…</p>';

  try {
    const [manifestResp, titlesResp] = await Promise.all([
      fetch('/assets/audio/processed/manifest.json', { cache: 'no-store' }),
      fetch('/assets/audio/processed/titles.json', { cache: 'no-store' }),
    ]);

    if (!manifestResp.ok) {
      throw new Error('No processed manifest found yet. Run sync/process first.');
    }

    const manifest = await manifestResp.json();
    const titles = titlesResp.ok ? await titlesResp.json() : {};

    const recordings = manifest.recordings || [];
    titleForm.innerHTML = '';

    if (!recordings.length) {
      titleForm.innerHTML = '<p>No processed recordings available yet.</p>';
      return;
    }

    recordings.forEach((rec) => {
      const wrap = document.createElement('label');
      wrap.className = 'recordings-title-row';
      wrap.innerHTML = `
        <span>${rec.date}</span>
        <input data-date="${rec.date}" type="text" value="${(titles[rec.date] || rec.displayDate || rec.date).replace(/"/g, '&quot;')}" maxlength="120" />
      `;
      titleForm.appendChild(wrap);
    });
  } catch (error) {
    titleForm.innerHTML = `<p>${error.message}</p>`;
  }
}

async function saveTitles() {
  const token = getToken();
  if (!token) {
    setStatus(titleStatus, 'Login required before saving titles.', true);
    return;
  }

  const inputs = Array.from(titleForm.querySelectorAll('input[data-date]'));
  const payload = {};
  for (const input of inputs) {
    payload[input.dataset.date] = input.value.trim();
  }

  setStatus(titleStatus, 'Saving titles to GitHub...');

  const response = await fetch('/api/github-update-recording-titles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, titles: payload }),
  });

  const data = await response.json();
  if (!response.ok) {
    setStatus(titleStatus, data?.error || 'Failed to save titles.', true);
    return;
  }

  setStatus(titleStatus, 'Titles saved. Website will reflect update after deploy cache refresh.');
}

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  const data = event.data || {};
  if (data.type === 'google-oauth-success' && data.accessToken) {
    setGoogleAccessToken(data.accessToken);
    updateGoogleStatus();
  }
});

googleConnectButton?.addEventListener('click', () => {
  const token = getToken();
  if (!token) {
    setStatus(googleStatus, 'Login first, then connect Google.', true);
    return;
  }

  const url = `/api/google-oauth-start?token=${encodeURIComponent(token)}&origin=${encodeURIComponent(window.location.origin)}`;
  window.open(url, 'google_oauth', 'width=520,height=700');
});

saveTitlesButton?.addEventListener('click', () => {
  saveTitles().catch((error) => setStatus(titleStatus, error.message || 'Failed to save titles.', true));
});

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus(loginStatus, 'Authenticating...');

  try {
    const response = await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passwordInput.value }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Login failed');
    }

    setToken(data.token);
    setStatus(loginStatus, 'Authenticated. Now connect Google Drive.');
    passwordInput.value = '';
  } catch (error) {
    setStatus(loginStatus, error.message, true);
  }
});

uploadForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearResults();

  const token = getToken();
  if (!token) {
    setStatus(uploadStatus, 'Login required before upload.', true);
    return;
  }

  const googleAccessToken = getGoogleAccessToken();
  if (!googleAccessToken) {
    setStatus(uploadStatus, 'Connect Google Drive before uploading.', true);
    return;
  }

  const files = Array.from(filesInput.files || []);
  if (!files.length) {
    setStatus(uploadStatus, 'Select at least one MP3 file.', true);
    return;
  }

  setStatus(uploadStatus, `Uploading ${files.length} file(s) to Google Drive...`);

  let success = 0;
  for (const file of files) {
    try {
      if (!file.name.toLowerCase().endsWith('.mp3')) {
        throw new Error('Only MP3 files are allowed');
      }
      const maxBytes = MAX_SINGLE_FILE_MB * 1024 * 1024;
      if (file.size > maxBytes) {
        throw new Error(`File too large (> ${MAX_SINGLE_FILE_MB} MB)`);
      }

      const { uploadUrl, filename } = await initDriveUpload({ token, file, googleAccessToken });
      const uploadResult = await uploadToDriveResumable(uploadUrl, file);

      success += 1;
      addResult(`✅ ${filename} uploaded to Drive (id: ${uploadResult.id || 'ok'})`);
    } catch (error) {
      const msg = error?.message || 'Unknown upload error';
      if (msg.toLowerCase().includes('failed to fetch')) {
        success += 1;
        addResult(`⚠️ ${file.name} → Browser reported fetch error, but upload may have completed. Please confirm in Drive.`);
      } else {
        addResult(`❌ ${file.name} → ${msg}`);
      }
    }
  }

  const failed = files.length - success;
  if (failed === 0) {
    setStatus(uploadStatus, `Upload complete. ${success}/${files.length} succeeded.`);
  } else {
    setStatus(uploadStatus, `Upload finished with errors. ${success}/${files.length} succeeded.`, true);
  }
});

updateGoogleStatus();
loadTitleEditor();
