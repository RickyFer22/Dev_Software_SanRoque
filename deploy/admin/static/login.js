'use strict';
// Script del login extraído a archivo externo: el CSP del panel usa
// `script-src 'self'` (sin unsafe-inline), por lo que un <script> inline
// quedaría bloqueado y el formulario haría un GET nativo con las
// credenciales en la URL. Servido desde /admin/static/login.js.
(function () {
  const form = document.getElementById('login-form');
  const userInput = document.getElementById('login-user');
  const passInput = document.getElementById('login-pass');
  const submitButton = document.getElementById('login-submit');
  const submitLabel = document.getElementById('login-submit-label');
  const feedback = document.getElementById('login-feedback');
  const togglePassword = document.getElementById('toggle-password');

  function setFeedback(message, success = false) {
    feedback.textContent = message;
    feedback.classList.toggle('success', success);
  }

  function setBusy(busy) {
    form.setAttribute('aria-busy', String(busy));
    submitButton.setAttribute('aria-busy', String(busy));
    submitButton.disabled = busy;
    submitLabel.textContent = busy ? 'Verificando acceso…' : 'Ingresar al panel';
  }

  togglePassword.addEventListener('click', () => {
    const showing = passInput.type === 'text';
    passInput.type = showing ? 'password' : 'text';
    togglePassword.setAttribute('aria-pressed', String(!showing));
    togglePassword.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
    passInput.focus();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitButton.disabled) return;

    const username = userInput.value.trim();
    const password = passInput.value;
    setFeedback('');

    if (!username || !password) {
      setFeedback('Completá el usuario y la contraseña.');
      (!username ? userInput : passInput).focus();
      return;
    }

    setBusy(true);
    try {
      const response = await fetch('/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        setFeedback(response.status === 403
          ? 'El usuario o la contraseña no son correctos.'
          : 'No pudimos iniciar sesión. Intentá nuevamente.');
        passInput.select();
        return;
      }

      setFeedback('Acceso correcto. Abriendo el panel…', true);
      const params = new URLSearchParams(window.location.search);
      const nextPath = params.get('next') || '/admin';
      window.location.assign(nextPath.startsWith('/') ? nextPath : '/admin');
    } catch (error) {
      setFeedback('No se pudo conectar con el servidor. Revisá tu conexión e intentá nuevamente.');
    } finally {
      setBusy(false);
    }
  });
})();
