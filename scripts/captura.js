// captura.js — toma screenshots de mockup.html (desktop + móvil)
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const file = 'file:///C:/Users/juanc/OneDrive/Documentos/UMB/ChambaYa/mockup.html';

  // —— Desktop 1440px ——
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktop.goto(file, { waitUntil: 'networkidle', timeout: 45000 });
  await desktop.waitForTimeout(1200);
  await desktop.screenshot({ path: 'captura-desktop-hero.png' });

  // Scroll al grid de directora
  await desktop.evaluate(() => document.getElementById('directorio').scrollIntoView());
  await desktop.waitForTimeout(600);
  await desktop.screenshot({ path: 'captura-desktop-grid.png' });
  await desktop.close();

  // —— iPhone 390px ——
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await mobile.goto(file, { waitUntil: 'networkidle', timeout: 45000 });
  await mobile.waitForTimeout(1200);
  await mobile.screenshot({ path: 'captura-movil-hero.png' });
  await mobile.close();

  await browser.close();
  console.log('OK: capturas generadas');
})();