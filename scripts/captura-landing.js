// captura-landing.js — verifica el nuevo index.html (desktop + móvil)
const { chromium } = require('playwright');

// Bloquea recursos externos lentos que no afectan el layout principal
const BLOCK = [
  'fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com',
  'unpkg.com', 'gstatic.com/firebasejs', 'images.unsplash.com', 'tile.openstreetmap.org',
  'js/chatbot-data.js', 'js/chatbot.js'
];

(async () => {
  const browser = await chromium.launch();
  const file = 'file:///C:/Users/juanc/OneDrive/Documentos/UMB/ChambaYa/index.html';

  async function makePage(vp) {
    const page = await browser.newPage(vp);
    await page.route('**/*', route => {
      const u = route.request().url();
      if (BLOCK.some(b => u.includes(b))) return route.abort();
      return route.continue();
    });
    return page;
  }

  // Desktop 1440px
  const desktop = await makePage({ viewport: { width: 1440, height: 900 } });
  await desktop.goto(file, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await desktop.waitForTimeout(1200);
  await desktop.screenshot({ path: 'verif-landing-hero.png' });
  await desktop.evaluate(() => document.getElementById('zonas').scrollIntoView());
  await desktop.waitForTimeout(700);
  await desktop.screenshot({ path: 'verif-landing-zonas.png' });
  await desktop.evaluate(() => document.getElementById('directorio').scrollIntoView());
  await desktop.waitForTimeout(700);
  await desktop.screenshot({ path: 'verif-landing-directorio.png' });
  await desktop.close();

  // Móvil 390px
  const mobile = await makePage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mobile.goto(file, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await mobile.waitForTimeout(1200);
  await mobile.screenshot({ path: 'verif-landing-movil.png' });
  await mobile.close();

  await browser.close();
  console.log('OK: capturas landing generadas');
})();