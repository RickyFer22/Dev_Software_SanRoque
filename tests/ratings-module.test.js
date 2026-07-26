const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createFakeDom() {
  class FakeClassList {
    constructor(owner) { this.owner = owner; this.set = new Set(); }
    add(...tokens) { tokens.forEach((token) => this.set.add(token)); this.owner.className = Array.from(this.set).join(' '); }
    remove(...tokens) { tokens.forEach((token) => this.set.delete(token)); this.owner.className = Array.from(this.set).join(' '); }
    toggle(token, force) { if (force === undefined) { if (this.set.has(token)) this.set.delete(token); else this.set.add(token); } else if (force) this.set.add(token); else this.set.delete(token); this.owner.className = Array.from(this.set).join(' '); }
  }

  class FakeElement {
    constructor(tagName = 'div') {
      this.tagName = tagName.toUpperCase();
      this.children = [];
      this.parentNode = null;
      this.classList = new FakeClassList(this);
      this.className = '';
      this.dataset = {};
      this.attributes = {};
      this.disabled = false;
      this.textContent = '';
      this.innerHTML = '';
      this.value = '';
    }
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
    insertBefore(child, before) { child.parentNode = this; const index = this.children.indexOf(before); if (index >= 0) this.children.splice(index, 0, child); else this.children.push(child); return child; }
    removeChild(child) { this.children = this.children.filter((entry) => entry !== child); child.parentNode = null; return child; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; }
    addEventListener() {}
    querySelectorAll() { return []; }
    querySelector() { return null; }
  }

  const document = {
    head: new FakeElement('head'),
    body: new FakeElement('body'),
    createElement(tagName) { return new FakeElement(tagName); },
    getElementById() { return null; },
  };

  return { document };
}

test('mountInteractive does not render the average badge when there are no ratings yet', () => {
  const { document } = createFakeDom();
  const storage = {};
  const localStorage = {
    getItem(key) { return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null; },
    setItem(key, value) { storage[key] = String(value); },
    removeItem(key) { delete storage[key]; },
  };

  const window = {
    document,
    localStorage,
    console,
  };
  const context = vm.createContext({ window, document, localStorage, console, setTimeout, clearTimeout });
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'ratings.js'), 'utf8');
  vm.runInContext(source, context);

  const container = document.createElement('div');
  container.setAttribute('data-type', 'alojamiento');
  container.setAttribute('data-id', 'hotel-1');
  container.classList.add('vsr-interactive');

  window.VsrRatings.mountInteractive(container);

  const avgLine = container.children.find((child) => child.className.includes('vsr-rate-avg-line'));
  assert.equal(avgLine, undefined, 'No debería añadirse una línea de promedio cuando no hay votos');
});
