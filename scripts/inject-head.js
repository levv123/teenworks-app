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
    <meta name="theme-color" content="#6C47FF" />
    <meta name="application-name" content="TeenWorks" />

    <!-- ── Favicons ───────────────────────────────────────────────── -->
    <link rel="icon" type="image/x-icon"  href="/favicon.ico" />
    <link rel="icon" type="image/png" sizes="32x32"    href="/favicon-32.png" />
    <link rel="apple-touch-icon"    sizes="192x192"    href="/favicon-192.png" />
    <link rel="manifest" href="/manifest.json" />

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
`;

// Patch title while we're here
html = html.replace(
  '<title>TeenWorks</title>',
  '<title>TeenWorks — Real Work for Real Teens</title>'
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
