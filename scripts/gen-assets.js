import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log('Starting dev server...');
    const child = spawn('npm', ['run', 'dev'], { cwd: path.join(__dirname, '..'), shell: true });

    // Wait to let dev server start
    await new Promise(r => setTimeout(r, 6000));

    console.log('Launching browser...');
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Screen 1: Landing page
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:5173');
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(__dirname, '../public/screenshots/screen1.png') });

    // Try to find the "Taxpayer" button and click it for Screen 2
    try {
        const tpButton = await page.$('text=/Taxpayer/i');
        if (tpButton) {
            await tpButton.click();
            await new Promise(r => setTimeout(r, 1000));
            const startBtn = await page.$('text=/Start/i');
            if (startBtn) await startBtn.click();
            await new Promise(r => setTimeout(r, 1000));
        }
    } catch (e) {
        console.log('Could not navigate to workspace, taking whatever is on screen');
    }
    await page.screenshot({ path: path.join(__dirname, '../public/screenshots/screen2.png') });

    // Icons
    const iconHtml = `
    <html style="margin:0;padding:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#1E293B;font-family:sans-serif;">
      <div style="font-size:10em;color:#10B981;display:flex;align-items:center;justify-content:center;width:100%;height:100%;">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="70%" height="70%">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <path d="M9 15l2 2 4-4"></path>
        </svg>
      </div>
    </html>
  `;
    await page.setViewportSize({ width: 512, height: 512 });
    await page.setContent(iconHtml);
    await page.screenshot({ path: path.join(__dirname, '../public/icon-512.png'), omitBackground: false });

    await page.setViewportSize({ width: 192, height: 192 });
    await page.screenshot({ path: path.join(__dirname, '../public/icon-192.png'), omitBackground: false });

    await browser.close();
    child.kill();
    console.log('Done!');
    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
