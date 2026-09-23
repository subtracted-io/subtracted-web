import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/companion.js', import.meta.url), 'utf8');

// Exercise the actual event handlers with a minimal DOM and deterministic clock.
function setup() {
  const listeners = new Map();
  const windowListeners = new Map();
  const classes = new Set();
  const styles = new Map();
  const captures = new Set();
  const hearts = new Set();
  const timers = new Map();
  let time = 0;
  let timerId = 0;
  const button = {
    offsetWidth: 64, offsetHeight: 64,
    classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
    style: { setProperty: (key, value) => styles.set(key, value), removeProperty: key => styles.delete(key) },
    addEventListener: (name, callback) => listeners.set(name, callback),
    append: heart => hearts.add(heart),
    getBoundingClientRect: () => ({ left: parseFloat(styles.get('--companion-x') ?? 200), top: parseFloat(styles.get('--companion-y') ?? 400) }),
    setPointerCapture: id => captures.add(id),
    hasPointerCapture: id => captures.has(id),
    releasePointerCapture: id => captures.delete(id),
  };
  const win = { innerHeight: 700, addEventListener: (name, callback) => windowListeners.set(name, callback) };
  const doc = {
    documentElement: { clientWidth: 1000 },
    querySelector: () => button,
    createElement: () => { const heart = { setAttribute() {}, addEventListener() {}, remove: () => hearts.delete(heart) }; return heart; },
  };
  vm.runInNewContext(source, { document: doc, window: win, setTimeout: (fn, delay) => { timers.set(++timerId, { fn, at: time + delay }); return timerId; }, clearTimeout: id => timers.delete(id) });
  const emit = (name, values = {}) => listeners.get(name)?.({ pointerId: 1, isPrimary: true, button: 0, clientX: 220, clientY: 420, detail: 1, preventDefault() {}, ...values });
  const tick = amount => { time += amount; for (const [id, task] of timers) if (task.at <= time) { timers.delete(id); task.fn(); } };
  return { emit, tick, classes, captures, hearts, button, win, doc, windowEvent: name => windowListeners.get(name)?.() };
}

test('small movement remains a click; dragging suppresses only the subsequent pointer click', () => {
  const s = setup();
  s.emit('pointerdown'); s.emit('pointermove', { clientX: 223 }); s.emit('pointerup'); s.emit('click');
  assert.equal(s.hearts.size, 1);
  assert.equal(s.classes.has('is-moved'), false);
  s.emit('pointerdown'); s.emit('pointermove', { clientX: 300 }); s.emit('pointerup'); s.emit('click');
  assert.equal(s.hearts.size, 1);
  s.emit('click', { detail: 0 }); // Keyboard/assistive activation remains available.
  assert.equal(s.hearts.size, 2);
  s.emit('pointerdown'); s.emit('pointerup'); s.emit('click');
  assert.equal(s.hearts.size, 3);
});

for (const interruption of ['pointercancel', 'lostpointercapture', 'blur']) {
  test(`${interruption} clears dragging and allows a new gesture`, () => {
    const s = setup();
    s.emit('pointerdown'); s.emit('pointermove', { clientX: 300 });
    assert.equal(s.classes.has('is-dragging'), true);
    if (interruption === 'blur') s.windowEvent('blur'); else s.emit(interruption);
    assert.equal(s.classes.has('is-dragging'), false);
    assert.equal(s.captures.size, 0);
    s.emit('pointerdown'); s.emit('pointermove', { clientX: 350 });
    assert.equal(s.classes.has('is-dragging'), true);
  });
}

test('secondary pointers cannot take over a drag; movement and resizing stay bounded', () => {
  const s = setup();
  s.emit('pointerdown'); s.emit('pointermove', { pointerId: 2, clientX: 900 });
  assert.equal(s.classes.has('is-moved'), false);
  s.emit('pointermove', { clientX: 2000, clientY: 2000 }); s.emit('pointerup');
  assert.deepEqual(s.button.getBoundingClientRect(), { left: 928, top: 628 });
  s.doc.documentElement.clientWidth = 320; s.win.innerHeight = 400; s.windowEvent('resize');
  assert.deepEqual(s.button.getBoundingClientRect(), { left: 248, top: 328 });
});

test('arrows move, modified arrows remain untouched, and Escape restores home', () => {
  const s = setup();
  s.emit('keydown', { key: 'ArrowLeft', metaKey: true });
  assert.equal(s.classes.has('is-moved'), false);
  s.emit('keydown', { key: 'ArrowLeft' });
  assert.equal(s.button.getBoundingClientRect().left, 184);
  s.emit('keydown', { key: 'Escape' });
  assert.equal(s.classes.has('is-moved'), false);
  assert.equal(s.button.getBoundingClientRect().left, 200);
});

test('each click extends petting while hearts expire independently', () => {
  const s = setup();
  s.emit('click'); s.tick(1000); s.emit('click'); s.tick(500);
  assert.equal(s.hearts.size, 1);
  assert.equal(s.classes.has('is-petted'), true);
  s.tick(1000);
  assert.equal(s.hearts.size, 0);
  assert.equal(s.classes.has('is-petted'), false);
});
