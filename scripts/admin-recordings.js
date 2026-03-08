const storageKey = 'arbahara_admin_token';

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

async function fileToBase64(file) {
  const arrayBuffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
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

  setStatus(uploadStatus, `Uploading ${files.length} file(s)...`);

  let success = 0;
  for (const file of files) {
    try {
      if (!file.name.toLowerCase().endsWith('.mp3')) {
        throw new Error('Only MP3 files are allowed');
      }

      const dataBase64 = await fileToBase64(file);
      const response = await fetch('/api/github-upload-recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          filename: file.name,
          dataBase64,
          contentType: file.type || 'audio/mpeg',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Upload failed');
      }

      success += 1;
      addResult(`✅ ${file.name} → ${data.path}`);
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
