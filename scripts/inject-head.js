/**
 * Post-build script: inject favicon + SEO metadata into dist/index.html.
 * Expo SDK 51 generates its own index.html without these tags, so we
 * patch it right after `expo export` runs.
 */
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const inject = `
    <!-- ── Primary metadata ───────────────────────────────────────── -->
    <meta name="description" content="TeenWorks connects teens with local clients for real paid work — lawn care, tutoring, video editing, and more. Build your reputation, grow your trust score, and get hired." />
    <meta name="theme-color" content="#000000" />
    <meta name="application-name" content="TeenWorks" />

    <!-- ── Favicons ───────────────────────────────────────────────── -->
    <link rel="icon" type="image/x-icon"  href="/favicon.ico" />
    <link rel="icon" type="image/png" sizes="32x32"    href="/favicon-32.png" />
    <link rel="apple-touch-icon"    sizes="192x192"    href="/favicon-192.png" />
    <link rel="manifest" href="/manifest.json" />

    <!-- ── iOS home-screen app ────────────────────────────────────── -->
    <!-- Added to the Home Screen, iOS launches this full-screen with no Safari
         chrome and a black status bar, matching the app's background. -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="TeenWorks" />
    <meta name="mobile-web-app-capable" content="yes" />

    <!-- ── Open Graph ─────────────────────────────────────────────── -->
    <meta property="og:type"        content="website" />
    <meta property="og:title"       content="TeenWorks — Real Work for Real Teens" />
    <meta property="og:description" content="Teens earn real money doing real work. Clients find trusted local help fast." />
    <meta property="og:image"       content="https://myteenworks.com/favicon-512.png" />
    <meta property="og:url"         content="https://myteenworks.com" />
    <meta property="og:site_name"   content="TeenWorks" />

    <!-- ── Twitter card ───────────────────────────────────────────── -->
    <meta name="twitter:card"        content="summary" />
    <meta name="twitter:title"       content="TeenWorks — Real Work for Real Teens" />
    <meta name="twitter:description" content="Teens earn real money doing real work. Clients find trusted local help fast." />
    <meta name="twitter:image"       content="https://myteenworks.com/favicon-512.png" />

    <!-- ── Black page background ──────────────────────────────────── -->
    <!-- Expo generates dist/index.html itself, so the reset in web/index.html
         never reaches the build. Without this the page flashes white before
         the RN-web tree mounts. -->
    <style>
      html, body, #root { background-color: #000000; }
      body { color-scheme: dark; }
    </style>
`;

// Patch title while we're here
html = html.replace(
  '<title>TeenWorks</title>',
  '<title>TeenWorks — Real Work for Real Teens</title>'
);

// Let the layout reach under the notch and home indicator. The app already pads
// with safe-area insets, which read as 0 unless the viewport opts into cover.
html = html.replace(
  'content="width=device-width, initial-scale=1, shrink-to-fit=no"',
  'content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"'
);

// Inject before </head>
if (html.includes('</head>')) {
  html = html.replace('</head>', inject + '  </head>');
  fs.writeFileSync(htmlPath, html);
  console.log('✅ Injected favicon + SEO metadata into dist/index.html');
} else {
  console.error('❌ Could not find </head> in dist/index.html');
  process.exit(1);
}
