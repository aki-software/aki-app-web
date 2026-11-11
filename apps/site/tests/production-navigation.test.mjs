import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const site = new URL('../', import.meta.url);

function navigation(path, webUrl = '') {
  const source = readFileSync(
    new URL('src/components/Navbar.astro', site), 'utf8'
  ).split('---')[1];
  const start = source.indexOf(
    'const ', source.indexOf('Astro.props;') + 12
  );
  const code = source.slice(start)
    .replaceAll('import.meta.env', 'ENV');

  return vm.runInNewContext(
    `${code}; ({ dashboardUrl, langPath })`,
    {
      ENV: { DEV: false, PUBLIC_WEB_URL: webUrl },
      locale: path.startsWith('/en') ? 'en' : 'es',
      Astro: { url: { pathname: path } },
    }
  );
}

test('S2: preserve an explicitly configured login destination', () => {
  const url = 'https://app.orientaki.com/login';
  assert.equal(navigation('/', url).dashboardUrl, url);
});

test('S2: every legal language alternate has a static route', () => {
  for (const path of [
    '/privacidad', '/terminos', '/borrar-cuenta', '/politica',
    '/en/privacidad', '/en/terminos', '/en/borrar-cuenta',
  ]) {
    const destination = navigation(path).langPath;
    const routeExists = [
      `src/pages${destination}.astro`,
      `src/pages${destination}/index.astro`,
    ].some(file => existsSync(new URL(file, site)));
    assert.ok(routeExists, `${path} points to missing ${destination}`);
  }
});

test('S2: preserve root, trailing-slash and default login destinations', () => {
  assert.equal(navigation('/', 'https://app.orientaki.com').dashboardUrl,
    'https://app.orientaki.com/login');
  assert.equal(navigation('/', 'https://app.orientaki.com/').dashboardUrl,
    'https://app.orientaki.com/login');
  assert.equal(navigation('/', 'https://app.orientaki.com/login/').dashboardUrl,
    'https://app.orientaki.com/login');
  assert.equal(navigation('/').dashboardUrl,
    'https://app.akituespacio.com.ar/login');
});
