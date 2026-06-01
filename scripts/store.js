(() => {
  const form = document.getElementById('cross-store-form');
  const amountInput = document.getElementById('amount');
  const message = document.getElementById('store-message');

  if (!form || !amountInput || !message) return;

  const setMessage = (text, isError = false) => {
    message.textContent = text;
    message.classList.toggle('error', isError);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const amount = Number(amountInput.value);
    if (!Number.isFinite(amount) || amount < 100) {
      setMessage('Please enter at least $100.', true);
      amountInput.focus();
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    setMessage('Opening secure checkout...');

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Checkout could not be started.');
      }

      window.location.href = data.url;
    } catch (error) {
      setMessage(error.message || 'Checkout could not be started.', true);
      button.disabled = false;
    }
  });
})();
