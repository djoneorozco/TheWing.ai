import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('embed derives its URL and accepts height only from its own frame and origin', () => {
  const listeners = {};
  const frame = { style: {}, setAttribute() {}, addEventListener() {}, contentWindow: { postMessage() {} } };
  const host = { appendChild(node) { assert.equal(node, frame); } };
  const script = { src: 'https://host.example/PCS-Tracker/embed.js', parentNode: { insertBefore(node) { assert.equal(node, host); } } };
  const document = { currentScript: script, createElement(tag) { return tag === 'iframe' ? frame : host; } };
  const window = { location: { origin: 'https://page.example' }, addEventListener(name, fn) { listeners[name] = fn; }, requestAnimationFrame() {} };
  vm.runInNewContext(readFileSync(new URL('../embed.js', import.meta.url), 'utf8'), { document, window, URL, Number, Math });
  assert.equal(frame.src, 'https://host.example/PCS-Tracker/index.html?embed=1&parentOrigin=https%3A%2F%2Fpage.example');
  const data = { type: 'pcsunited:pcs-tracker:resize', version: 1, height: 900 };
  listeners.message({ source: {}, origin: 'https://host.example', data });
  assert.equal(frame.style.height, undefined);
  listeners.message({ source: frame.contentWindow, origin: 'https://evil.example', data });
  assert.equal(frame.style.height, undefined);
  listeners.message({ source: frame.contentWindow, origin: 'https://host.example', data });
  assert.equal(frame.style.height, '900px');
  listeners.message({ source: frame.contentWindow, origin: 'https://host.example', data: { ...data, height: Infinity } });
  assert.equal(frame.style.height, '900px');
});
