(function () {
  let activeEditor = null;
  let returnFocus = null;
  let mediaResolver = null;

  function editorFor(resource) {
    return document.querySelector(`[data-editor="${resource}"]`);
  }

  function setPageLocked(locked) {
    document.body.classList.toggle('editor-open', locked);
    const backdrop = document.getElementById('editor-backdrop');
    if (backdrop) backdrop.hidden = !locked;
    const globalClose = document.getElementById('editor-close');
    if (globalClose) globalClose.hidden = !locked;
  }

  function openEditor(resource, title) {
    const panel = editorFor(resource);
    if (!panel) return false;
    returnFocus = document.activeElement;
    document.querySelectorAll('[data-editor]').forEach((item) => {
      item.hidden = item !== panel;
    });
    activeEditor = panel;
    panel.hidden = false;
    panel.dataset.state = 'open';
    panel.setAttribute('aria-hidden', 'false');
    const heading = panel.querySelector('[data-editor-title]');
    if (heading && title) heading.textContent = title;
    setPageLocked(true);
    const firstField = panel.querySelector('input:not([type="hidden"]):not([type="file"]), select:not([multiple]), textarea, button');
    if (firstField) firstField.focus();
    return true;
  }

  function closeEditor() {
    if (activeEditor) {
      activeEditor.hidden = true;
      activeEditor.dataset.state = 'closed';
      activeEditor.setAttribute('aria-hidden', 'true');
    }
    activeEditor = null;
    setPageLocked(false);
    if (returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
    returnFocus = null;
  }

  function confirmAction({ title, message, confirmLabel = 'Confirmar', danger = false }) {
    const dialog = document.getElementById('confirm-dialog');
    if (!dialog) return Promise.resolve(false);
    dialog.querySelector('[data-confirm-title]').textContent = title;
    dialog.querySelector('[data-confirm-message]').textContent = message;
    const accept = dialog.querySelector('[data-confirm-accept]');
    accept.textContent = confirmLabel;
    accept.classList.toggle('danger-button', danger);
    dialog.showModal();
    return new Promise((resolve) => {
      dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true });
    });
  }

  function openMediaPicker({ onSelect }) {
    const picker = document.getElementById('media-picker');
    if (!picker) return;
    mediaResolver = onSelect;
    picker.hidden = false;
    const first = picker.querySelector('button, input');
    if (first) first.focus();
  }

  function chooseMedia(url) {
    if (typeof mediaResolver === 'function') mediaResolver(url);
    closeMediaPicker();
  }

  function closeMediaPicker() {
    const picker = document.getElementById('media-picker');
    if (picker) picker.hidden = true;
    mediaResolver = null;
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const picker = document.getElementById('media-picker');
      if (picker && !picker.hidden) {
        closeMediaPicker();
        return;
      }
      if (activeEditor) {
        closeEditor();
      }
    }
  });

  window.AdminUI = { openEditor, closeEditor, confirmAction, openMediaPicker, closeMediaPicker, chooseMedia };
})();
