(() => {
  const gallery = document.querySelector('.gallery');
  if (!gallery) return;
  const items = Array.from(gallery.querySelectorAll('img'));
  const overlay = document.createElement('div');
  overlay.className = 'gallery-overlay';
  overlay.innerHTML = `
    <div class="gallery-overlay-content">
      <button class="gallery-overlay-close" aria-label="Close">×</button>
      <img src="" alt="" />
      <div class="gallery-overlay-actions">
        <a class="button primary" download="" href="">Download</a>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const overlayImage = overlay.querySelector('img');
  const downloadLink = overlay.querySelector('a');
  const closeBtn = overlay.querySelector('.gallery-overlay-close');

  const openOverlay = (src, alt) => {
    overlay.classList.add('is-visible');
    overlayImage.src = src;
    overlayImage.alt = alt;
    downloadLink.href = src;
    downloadLink.setAttribute('download', alt.replace(/\s+/g, '_').toLowerCase() || 'gallery');
  };

  const closeOverlay = () => {
    overlay.classList.remove('is-visible');
  };

  items.forEach((img) => {
    img.style.cursor = 'pointer';
    img.addEventListener('click', () => openOverlay(img.src, img.alt || 'gallery'));
  });

  closeBtn.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeOverlay();
  });
})();
