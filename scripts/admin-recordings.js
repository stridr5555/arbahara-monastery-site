const storageKey = 'arbahara_admin_token';
const MAX_SINGLE_FILE_MB = 500;

const loginForm = document.getElementById('admin-login-form');
const passwordInput = document.getElementById('admin-password');
const loginStatus = document.getElementById('login-status');

const uploadForm = document.getElementById('upload-form');
const filesInput = document.getElementById('recording-files');
const uploadStatus = document.getElementById('upload-status');
const uploadResults = document.getElementById('upload-results');

function setStatus(el, text, isError = false) {
  el.textContent = text;
  el.style.color = isError ? '#b42318' : '#1f6f43';
}

function getToken() {
  return localStorage.getItem(storageKey) || '';
}

function setToken(token) {
  localStorage.setItem(storageKey, token);
}

function clearResults() {
  uploadResults.innerHTML = '';
}

function addResult(text) {
  const li = document.createElement('li');
  li.textContent = text;
  uploadResults.appendChild(li);
}

async function initDriveUpload({ token, file }) {
  const response = await fetch('/api/drive-upload-init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      filename: file.name,
      contentType: file.type || 'audio/mpeg',
      sizeBytes: file.size,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Drive init failed');
  }

  return data;
}

async function uploadToDriveResumable(uploadUrl, file) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'audio/mpeg',
      'Content-Length': String(file.size),
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
    setStatus(loginStatus, 'Authenticated. You can now upload files.');
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

      const { uploadUrl, filename } = await initDriveUpload({ token, file });
      const uploadResult = await uploadToDriveResumable(uploadUrl, file);

      success += 1;
      addResult(`✅ ${filename} uploaded to Drive (id: ${uploadResult.id || 'ok'})`);
    } catch (error) {
      addResult(`❌ ${file.name} → ${error.message}`);
    }
  }

  const failed = files.length - success;
  if (failed === 0) {
    setStatus(uploadStatus, `Upload complete. ${success}/${files.length} succeeded.`);
  } else {
    setStatus(uploadStatus, `Upload finished with errors. ${success}/${files.length} succeeded.`, true);
  }
});
