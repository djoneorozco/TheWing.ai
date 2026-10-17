const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../dialog-bridge.js'), 'utf8');
function setup(standalone = false) {
  const handlers = {}, sent = [];
  const parent = { postMessage: (data, origin) => sent.push({ data, origin }) };
  const window = { parent, addEventListener: (key, fn) => { (handlers[key] ||= []).push(fn); } };
  if (standalone) window.parent = window;
  const document = { documentElement: { dataset: {} }, addEventListener: window.addEventListener };
  const context = vm.createContext({ window, document, Set });
  vm.runInContext(source, context);
  const emit = (key, event = {}) => (handlers[key] || []).forEach(fn => fn(event));
  const connect = (extra = {}) => emit('message', { source: parent, origin: 'https://pcs-united-com.webflow.io', data: {
    source: 'pcsunited-base-map-dialog', type: 'pcsunited:map-dialog-state', open: true,
    channel: '12345678-1234-1234-1234-123456789012' }, ...extra });
  return { handlers, sent, parent, context, emit, connect };
}
test('only a validated parent can enable Escape; readiness requires the map ready event', () => {
  const x = setup();
  x.connect({ origin: 'https://evil.example' });
  x.connect({ source: {} });
  x.connect({ data: { type: 'pcsunited:map-dialog-state', channel: 'bad', open: true } });
  assert.equal(x.sent.length, 0);
  x.connect();
  assert.equal(x.sent.at(-1).data.ready, false);
  let prevented = false;
  x.emit('keydown', { key: 'Escape', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(x.sent.at(-1).data.type, 'pcsunited:map-dialog-close');
  assert.equal(x.sent.at(-1).origin, 'https://pcs-united-com.webflow.io');
  x.emit('pcsunited:base-map-ready');
  assert.equal(x.sent.at(-1).data.ready, true);
  x.connect();
  assert.equal(x.sent.at(-1).data.ready, true);
});
test('closed panels and handled keys do not send close; standalone map stays unaffected', () => {
  const x = setup(); x.connect();
  const data = { source: 'pcsunited-base-map-dialog', type: 'pcsunited:map-dialog-state', open: false, channel: '12345678-1234-1234-1234-123456789012' };
  x.connect({ data });
  const count = x.sent.length;
  x.emit('keydown', { key: 'Escape', preventDefault() { throw Error('Must not intercept'); } });
  assert.equal(x.sent.length, count);
  x.connect();
  const afterOpen = x.sent.length;
  x.emit('keydown', { key: 'Escape', defaultPrevented: true });
  x.emit('keydown', { key: 'Enter' });
  assert.equal(x.sent.length, afterOpen);
  assert.equal(Object.keys(setup(true).handlers).length, 0);
});
test('duplicate script initialization adds no duplicate listeners', () => {
  const x = setup();
  vm.runInContext(source, x.context);
  assert.equal(x.handlers.message.length, 1);
  assert.equal(x.handlers.keydown.length, 1);
});
