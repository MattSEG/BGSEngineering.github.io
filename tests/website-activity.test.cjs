const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const script = fs.readFileSync(require('node:path').join(__dirname, '../website-activity.js'), 'utf8');

function browser(options = {}) {
  let now = 0;
  let interval;
  const handlers = new Map();
  const calls = [];
  const document = {
    currentScript: {dataset: {endpoint: 'https://crm.example.test/website/collect'}},
    visibilityState: 'visible', referrer: options.referrer || '',
    querySelectorAll: () => [{dataset: {hud: '03'}, getBoundingClientRect: () => ({top: 0, bottom: 1000})}],
    addEventListener: (name, callback) => handlers.set(name, callback),
  };
  const context = {
    document, location: {pathname: options.pathname || '/', search: options.search || '', href: 'https://bgsengineering.com/', origin: 'https://bgsengineering.com'},
    navigator: options.navigator || {},
    localStorage: {getItem: () => options.optout || null},
    crypto: {randomUUID: () => 'ca5fd6ae-0ef4-4d75-b102-bb70c70215d9'},
    URL, URLSearchParams, Set, innerHeight: 800,
    performance: {now: () => now},
    addEventListener: (name, callback) => handlers.set(name, callback),
    setInterval: callback => { interval = callback; },
    fetch: (url, options) => {
      calls.push({url, options, data: JSON.parse(options.body)});
      return Promise.resolve({ok: true});
    },
  };
  vm.runInNewContext(script, context);
  return {calls, document, handlers,
    tick(seconds) { for (let n = 0; n < seconds; n++) { now += 1000; if (interval) interval(); } },
    event(name, value = {}) { handlers.get(name)?.(value); },
    flush: () => new Promise(resolve => setImmediate(resolve))};
}

(async () => {
  for (const options of [{optout: '1'}, {navigator: {globalPrivacyControl: true}}, {navigator: {doNotTrack: '1'}}, {search: '?analytics=off'}, {pathname: '/other-tool'}]) {
    const b = browser(options); b.tick(30); await b.flush();
    assert.equal(b.calls.length, 0, 'Opt-out and non-homepage must make no measurement requests');
  }
  const b = browser({search: '?utm_source=email_signature&private_email=joe@example.com', referrer: 'https://linkedin.com/feed/?secret=value'});
  await b.flush();
  assert.equal(b.calls[0].data.kind, 'start');
  assert.equal(b.calls[0].options.credentials, 'omit');
  assert.equal(b.calls[0].data.utm_source, 'email_signature');
  assert.equal(b.calls[0].data.referrer, 'linkedin.com');
  assert(!JSON.stringify(b.calls).includes('joe@example.com'));
  assert(!JSON.stringify(b.calls).includes('secret=value'));
  b.tick(15); await b.flush();
  assert.equal(b.calls.at(-1).data.active_seconds, 15);
  assert.equal(b.calls.at(-1).data.sections['03'], 15);
  b.document.visibilityState = 'hidden'; b.event('visibilitychange'); await b.flush();
  b.tick(45); await b.flush();
  b.document.visibilityState = 'visible'; b.event('visibilitychange'); b.event('pointerdown');
  b.tick(15); await b.flush();
  assert.equal(b.calls.at(-1).data.active_seconds, 30, 'Hidden tab time must not accrue');
  for (let n = 0; n < 6; n++) { b.tick(15); await b.flush(); }
  assert.equal(b.calls.at(-1).data.active_seconds, 75, 'No active time beyond 60 seconds idle');
  const before = b.calls.length;
  b.event('bgs-analytics-optout'); b.tick(30); await b.flush();
  assert.equal(b.calls.length, before);
  const malicious = browser({search: '?utm_source=joe@example.com'}); await malicious.flush();
  assert.equal(malicious.calls[0].data.utm_source, '');
  console.log('Homepage tracker: opt-outs, scope, source minimization, hidden/idle timing and credentials passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
