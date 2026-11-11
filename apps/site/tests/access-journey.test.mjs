import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('hero and navigation lead to access requests while retaining app access', () => {
  const hero = read('components/Hero.astro');
  assert.match(hero, /href="#instituciones"[^>]*data-access-cta/);
  assert.match(hero, /href=\{playStoreUrl\}/);
  const nav = read('components/Navbar.astro');
  assert.doesNotMatch(nav, /href=\{playStoreUrl\}/);
  assert.match(nav, /href=\{dashboardUrl\}/);
  assert.match(nav, /http:\/\/localhost:5173/);
});

test('closing and sticky actions request access, in both languages', () => {
  const closing = read('components/FinalCta.astro');
  assert.equal((closing.match(/data-access-cta/g) || []).length, 2);
  const copy = read('i18n/translations.ts');
  assert.match(copy, /ctaPrimary: 'Solicitar acceso'/);
  assert.match(copy, /ctaPrimary: 'Request access'/);
  assert.match(copy, /title: 'Orientación vocacional'/);
  assert.match(copy, /titleAccent: 'para tu práctica profesional'/);
  assert.match(copy, /submit: 'Solicitar acceso'/);
});

test('contact keeps plan context, posts to API contact endpoint, and never confirms a mail draft as delivery', () => {
  const form = read('components/ContactForm.astro');
  assert.match(form, /PUBLIC_API_URL/);
  assert.match(form, /\/api\/v1\/contact|\/contact/);
  assert.match(form, /data-default-institution/);
  assert.match(form, /<select[^>]*id="selected-plan-input"/);
  assert.match(form, /value="demo"/);
  assert.match(form, /value="basic"/);
  assert.match(form, /value="pro"/);
  assert.match(form, /value="enterprise"/);
  assert.match(form, /akit:select-plan/);
  assert.match(form, /selected_plan: data.get\('selected_plan'\)/);
  assert.doesNotMatch(form, /setTimeout/);
  assert.match(form, /id="form-error"/);
  assert.match(form, /id="form-email-alternative"/);
  assert.match(form, /if \(planInput\) planInput.value = ''/);
  assert.doesNotMatch(form, /Request an institutional demo/);
});

test('legal pages cover Web and Android context, unify borrar-cuenta under Orient A.KI, and configure WhatsApp with predefined message', () => {
  const footer = read('components/Footer.astro');
  assert.doesNotMatch(footer, /5491100000000/);
  assert.doesNotMatch(footer, /Made with AI/);
  assert.match(footer, /\/privacidad/);
  assert.match(footer, /\/terminos/);
  assert.match(footer, /\/borrar-cuenta/);
  assert.match(footer, /whatsappHref/);

  const legal = read('i18n/legal.ts');
  assert.match(legal, /5491159899962/);
  assert.match(legal, /encodeURIComponent/);
  assert.match(legal, /Android/);
  assert.match(legal, /Google Play/);
  assert.match(legal, /Plataforma Web/);
  assert.doesNotMatch(legal, /CotejoApp/i);
  assert.doesNotMatch(legal, /cotejoapp/i);

  const deletePage = read('pages/borrar-cuenta.astro');
  assert.match(deletePage, /LegalPage/);
  assert.doesNotMatch(deletePage, /CotejoApp/i);

  const privacyPage = read('pages/privacidad.astro');
  const termsPage = read('pages/terminos.astro');
  assert.match(privacyPage, /docKey="privacy"/);
  assert.match(termsPage, /docKey="terms"/);
});

test('P1 hardening: pricing precedes contact form, professional tab is default, hero renders card copy, and Spanish section eyebrows do not leak into /en', () => {
  const indexEs = read('pages/index.astro');
  const indexEn = read('pages/en/index.astro');
  assert.ok(indexEs.indexOf('<Pricing') < indexEs.indexOf('<Institutions'));
  assert.ok(indexEn.indexOf('<Pricing') < indexEn.indexOf('<Institutions'));

  const howItWorks = read('components/HowItWorks.astro');
  assert.doesNotMatch(howItWorks, /EL PROCESO/);
  assert.ok(howItWorks.indexOf('id="btn-institution"') < howItWorks.indexOf('id="btn-student"'));

  const radar = read('components/Radar.astro');
  assert.doesNotMatch(radar, /METODOLOGÍA CIENTÍFICA/);

  const pricing = read('components/Pricing.astro');
  assert.doesNotMatch(pricing, /PLANES CLAROS/);

  const hero = read('components/Hero.astro');
  assert.match(hero, /id="card-title"/);
  assert.match(hero, /id="card-sub"/);
});

test('P1 clarify: pricing badges specify voucher units, contact form explains optional institution for private practice, and Features section is rendered', () => {
  const copy = read('i18n/translations.ts');
  assert.match(copy, /badge: 'Prueba guiada'/);
  assert.match(copy, /badge: 'Guided trial'/);
  assert.match(copy, /badge: '25 vouchers'/);
  assert.match(copy, /badge: '50 vouchers'/);
  assert.match(copy, /badge: '1000 vouchers'/);

  const form = read('components/ContactForm.astro');
  assert.match(form, /aria-describedby="institution-hint"/);
  assert.match(form, /id="institution-hint"/);

  const indexEs = read('pages/index.astro');
  const indexEn = read('pages/en/index.astro');
  assert.match(indexEs, /<Features locale=\{locale\} t=\{t\} \/>/);
  assert.match(indexEn, /<Features locale=\{locale\} t=\{t\} \/>/);
});

test('English route hardening: no Spanish category codes on /en, radar SVG viewBox prevents label clipping, and mailto fallback is localized', () => {
  const copy = read('i18n/translations.ts');
  assert.match(copy, /\{ code: 'PHY', name: 'Sports & Physical Activity' \}/);
  assert.match(copy, /\{ code: 'LEAD', name: 'Leadership' \}/);
  assert.match(copy, /\{ code: 'SAL', name: 'Sales' \}/);

  const radar = read('components/Radar.astro');
  assert.match(radar, /viewBox="-18 -6 136 112"/);

  const form = read('components/ContactForm.astro');
  assert.match(form, /data-locale=\{locale\}/);
  assert.match(form, /Access request - \$\{institution\}/);
  assert.match(form, /Hello, I would like to request access to the Orient A\.KI platform\./);

  const layout = read('layouts/BaseLayout.astro');
  assert.match(layout, /class="bg-bg text-text/);
  assert.match(layout, /class="skip-link"/);
});

test('P2 polish: sections alternate surface tokens across the landing page without consecutive bg-bg monotony', () => {
  const orderedComponents = [
    read('components/Hero.astro'),
    read('components/StatsBar.astro'),
    read('components/HowItWorks.astro'),
    read('components/Radar.astro'),
    read('components/Features.astro'),
    read('components/SocialProof.astro'),
    read('components/Pricing.astro'),
    read('components/Institutions.astro'),
    read('components/FAQ.astro'),
    read('components/FinalCta.astro'),
  ];

  const extractSectionSurface = (source) => {
    const match = source.match(/<section[^>]*class="([^"]+)"/);
    assert.ok(match, 'Expected <section class="..."> in component');
    const classes = match[1].split(/\s+/);
    const surface = classes.find((cls) =>
      ['bg-dark-bg', 'bg-surface', 'bg-bg', 'bg-primary-50/60'].includes(cls)
    );
    assert.ok(surface, `Expected a known surface token in: ${match[1]}`);
    return surface;
  };

  const surfaces = orderedComponents.map(extractSectionSurface);
  for (let i = 1; i < surfaces.length; i++) {
    assert.notEqual(
      surfaces[i],
      surfaces[i - 1],
      `Consecutive sections ${i - 1} and ${i} must not share the same background surface (${surfaces[i]})`
    );
  }
});
