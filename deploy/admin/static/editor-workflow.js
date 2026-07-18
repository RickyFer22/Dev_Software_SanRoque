(function () {
  let dirty = false;
  let activeResource = '';
  let autosaveTimer = 0;

  function activeEditor() { return document.querySelector('[data-editor]:not([hidden])'); }
  function draftKey(resource) { return `vsr_admin_draft_${resource}`; }

  function updateIndicator() {
    const indicator = activeEditor()?.querySelector('[data-unsaved-indicator]');
    if (!indicator) return;
    indicator.textContent = dirty ? 'Cambios sin guardar · borrador local activo' : 'Todos los cambios guardados';
    indicator.classList.toggle('is-dirty', dirty);
  }

  function serialize(panel) {
    const data = {};
    panel?.querySelectorAll('input[id],select[id],textarea[id]').forEach((field) => {
      if (field.type === 'file') return;
      data[field.id] = field.type === 'checkbox' ? field.checked : field.value;
    });
    return data;
  }

  function saveDraft() {
    const panel = activeEditor();
    if (!panel || !dirty || !activeResource) return;
    localStorage.setItem(draftKey(activeResource), JSON.stringify({ at: Date.now(), fields: serialize(panel) }));
    updateIndicator();
  }

  function markDirty() {
    if (!activeEditor()) return;
    dirty = true;
    updateIndicator();
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(saveDraft, 700);
  }

  function markClean(resource = activeResource) {
    dirty = false;
    if (resource) localStorage.removeItem(draftKey(resource));
    updateIndicator();
  }

  function selectTab(panel, name) {
    panel.querySelectorAll('[data-editor-tab]').forEach((button) => {
      const selected = button.dataset.editorTab === name;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    panel.querySelectorAll('[data-editor-panel]').forEach((section) => {
      const selected = section.dataset.editorPanel === name;
      section.hidden = !selected;
      section.classList.toggle('active', selected);
    });
  }

  function validate(panel) {
    const resource = panel?.dataset.editor;
    const fields = resource === 'alojamientos'
      ? [['alojamiento-titulo', 'Ingresá el nombre del alojamiento.'], ['alojamiento-categoria', 'Seleccioná una categoría.']]
      : resource === 'gastronomia'
        ? [['gastronomia-nombre', 'Ingresá el nombre comercial.'], ['gastronomia-tipo', 'Seleccioná el tipo de propuesta.']]
        : [];
    const errors = fields.filter(([id]) => !document.getElementById(id)?.value.trim());
    panel.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute('aria-invalid'));
    errors.forEach(([id]) => document.getElementById(id)?.setAttribute('aria-invalid', 'true'));
    const summary = panel.querySelector('[data-form-errors]');
    if (summary) {
      summary.hidden = !errors.length;
      summary.innerHTML = errors.length ? `<strong>Revisá ${errors.length === 1 ? 'este campo' : 'estos campos'}:</strong><ul>${errors.map(([, message]) => `<li>${message}</li>`).join('')}</ul>` : '';
    }
    if (errors.length) {
      selectTab(panel, 'general');
      document.getElementById(errors[0][0])?.focus();
    }
    return !errors.length;
  }

  function requestClose() {
    if (!dirty) return Promise.resolve(true);
    if (window.AdminUI?.confirmAction) {
      return window.AdminUI.confirmAction({ title: '¿Descartar los cambios?', message: 'Hay cambios que todavía no se guardaron en el servidor.', confirmLabel: 'Descartar', danger: true });
    }
    return Promise.resolve(window.confirm('Hay cambios sin guardar. ¿Descartarlos?'));
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-editor-tabs]').forEach((tabs) => {
      const panel = tabs.closest('[data-editor]');
      tabs.querySelectorAll('[data-editor-tab]').forEach((button) => button.addEventListener('click', () => selectTab(panel, button.dataset.editorTab)));
    });
    document.querySelectorAll('[data-editor]').forEach((panel) => {
      panel.addEventListener('input', markDirty);
      panel.addEventListener('change', markDirty);
    });
    document.body.addEventListener('click', (event) => {
      const submit = event.target.closest('[data-action="submit"]');
      if (submit && !validate(submit.closest('[data-editor]'))) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      const preview = event.target.closest('[data-preview-content]');
      if (preview) {
        const id = window.currentEdit?.id;
        const resource = preview.dataset.previewContent;
        const url = resource === 'gastronomia' ? `/gastronomia.html?g=${encodeURIComponent(id || '')}&preview=1` : `/index.html?h=${encodeURIComponent(id || '')}&preview=1`;
        window.open(url, '_blank', 'noopener');
      }
    }, true);
    window.addEventListener('beforeunload', (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  });

  document.addEventListener('editor:opened', (event) => {
    activeResource = event.detail?.resource || '';
    dirty = false;
    const panel = activeEditor();
    if (panel) selectTab(panel, 'general');
    updateIndicator();
  });
  document.addEventListener('editor:saved', (event) => markClean(event.detail?.resource));

  window.EditorWorkflow = Object.freeze({ markClean, markDirty, requestClose, validate });
})();
