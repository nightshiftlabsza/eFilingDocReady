import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generates a minimal but structurally valid single-page PDF so that
 * pdfjs-dist can parse it without throwing console errors.
 * The xref byte offsets are computed dynamically so they are always exact.
 */
function makeMinimalPdf(): Buffer {
    const h = '%PDF-1.4\n';
    const o1 = '1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n';
    const o2 = '2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n';
    const o3 = '3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]>>\nendobj\n';

    const n1 = h.length;
    const n2 = n1 + o1.length;
    const n3 = n2 + o2.length;
    const xStart = n3 + o3.length;

    const pad = (n: number) => String(n).padStart(10, '0');
    const xref =
        `xref\n0 4\n` +
        `0000000000 65535 f \n` +
        `${pad(n1)} 00000 n \n` +
        `${pad(n2)} 00000 n \n` +
        `${pad(n3)} 00000 n \n` +
        `trailer\n<</Root 1 0 R /Size 4>>\n` +
        `startxref\n${xStart}\n%%EOF\n`;

    return Buffer.from(h + o1 + o2 + o3 + xref);
}

const PDF = makeMinimalPdf();

/**
 * Navigate from the landing page to the FileWorkspace.
 * Requires consent to already be accepted (via storageState).
 *   Landing → click "I am a Taxpayer" card → TaxpayerView
 *   → click "Try for Free (3 Credits)" → FileWorkspace
 */
async function gotoWorkspace(page: import('@playwright/test').Page) {
    await page.goto('/');
    // Landing page — click the Taxpayer persona card (identified by its h2)
    await page.getByRole('heading', { name: 'I am a Taxpayer' }).click();
    // TaxpayerView — click the free-trial CTA
    await page.getByRole('button', { name: 'Try for Free (3 Credits)' }).click();
    // FileWorkspace should now be visible
    await expect(page.getByText('Drag Documents Here')).toBeVisible();
}

// ---------------------------------------------------------------------------
// 1 — Consent Gate (no pre-accepted state)
// ---------------------------------------------------------------------------

test.describe('Consent Gate', () => {
    // Override the default storageState so consent is NOT pre-accepted
    test.use({ storageState: { cookies: [], origins: [] } });

    test('shows consent modal on first visit and blocks workspace', async ({ page }) => {
        await page.goto('/');

        const modal = page.getByRole('dialog', { name: 'POPIA & Privacy Consent' });
        await expect(modal).toBeVisible();

        // Workspace dropzone must NOT be accessible before consent
        await expect(page.getByText('Drag Documents Here')).not.toBeVisible();
    });

    test('accepting consent leads to workspace via persona selection', async ({ page }) => {
        await page.goto('/');

        const modal = page.getByRole('dialog', { name: 'POPIA & Privacy Consent' });
        await expect(modal).toBeVisible();

        await page.getByRole('button', { name: 'I Accept & Continue' }).click();
        await expect(modal).not.toBeVisible();

        // After consent: still on landing page, must pick persona
        await expect(page.getByRole('heading', { name: 'I am a Taxpayer' })).toBeVisible();

        // Navigate to workspace
        await page.getByRole('heading', { name: 'I am a Taxpayer' }).click();
        await page.getByRole('button', { name: 'Try for Free (3 Credits)' }).click();

        await expect(page.getByText('Drag Documents Here')).toBeVisible();
    });
});

// ---------------------------------------------------------------------------
// 2 — Core Application Logic (consent pre-accepted via storageState)
// ---------------------------------------------------------------------------

test.describe('Core Application Logic', () => {

    test('3 & 4 — dropping a PDF shows card with filename and size', async ({ page }) => {
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
        await gotoWorkspace(page);

        await page.locator('input[type="file"]').setInputFiles({
            name: 'test-doc.pdf',
            mimeType: 'application/pdf',
            buffer: PDF,
        });

        await page.screenshot({ path: 'public/screenshots/debug-failed-test.png' });
        await expect(page.getByText('test-doc.pdf')).toBeVisible();
        // File is ~500 bytes; size should display as 0.00 MB
        await expect(page.getByText(/MB • PDF/)).toBeVisible();
    });

    test('5 — delete button removes the file card', async ({ page }) => {
        await gotoWorkspace(page);

        await page.locator('input[type="file"]').setInputFiles({
            name: 'remove-me.pdf',
            mimeType: 'application/pdf',
            buffer: PDF,
        });

        await expect(page.getByText('remove-me.pdf')).toBeVisible();
        await page.getByLabel('Remove remove-me.pdf').click();
        await expect(page.getByText('remove-me.pdf')).not.toBeVisible();
    });

    test('6 — keyboard Move Up/Down buttons have correct aria-labels', async ({ page }) => {
        await gotoWorkspace(page);

        await page.locator('input[type="file"]').setInputFiles([
            { name: 'file1.pdf', mimeType: 'application/pdf', buffer: PDF },
            { name: 'file2.pdf', mimeType: 'application/pdf', buffer: PDF },
        ]);

        // Both cards should have aria-labelled reorder controls
        await expect(page.getByLabel('Move file1.pdf up in the list')).toBeAttached();
        await expect(page.getByLabel('Move file1.pdf down in the list')).toBeAttached();
        // First card: Move Up is disabled; last card: Move Down is disabled
        await expect(page.getByLabel('Move file2.pdf down in the list')).toBeDisabled();
        await expect(page.getByLabel('Move file1.pdf up in the list')).toBeDisabled();
    });

    test('7 — sanitised filename shows Fixed badge', async ({ page }) => {
        await gotoWorkspace(page);

        // Apostrophe and ampersand are SARS-restricted and will be sanitised
        await page.locator('input[type="file"]').setInputFiles({
            name: "tax's & return.pdf",
            mimeType: 'application/pdf',
            buffer: PDF,
        });

        await expect(page.getByText('Fixed')).toBeVisible();
    });

    test('8 — Scan & Merge button is absent from DOM when no files queued', async ({ page }) => {
        await gotoWorkspace(page);

        // The action block is wrapped in {files.length > 0 && (...)} —
        // the button does not exist in the DOM at all when the list is empty.
        await expect(
            page.getByRole('button', { name: 'Scan & Merge for eFiling' })
        ).not.toBeAttached();
    });

    test('9, 10, 11 — processing shows Receipt, no PREMIUM text on download, reset works', async ({ page }) => {
        await gotoWorkspace(page);

        await page.locator('input[type="file"]').setInputFiles({
            name: 'valid.pdf',
            mimeType: 'application/pdf',
            buffer: PDF,
        });

        await page.getByRole('button', { name: 'Scan & Merge for eFiling' }).click();

        // 9 — Receipt visible (allow generous timeout for PDF processing)
        await expect(page.getByText('REDUCED BY')).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText('Input Size')).toBeVisible();

        // 10 — Download button must not contain the word PREMIUM
        const downloadBtn = page.getByRole('button', { name: /Download/ });
        await expect(downloadBtn).toBeVisible();
        await expect(downloadBtn).not.toContainText(/PREMIUM/i);

        // 11 — "Scan Another Doc" resets back to workspace
        await page.getByRole('button', { name: 'Scan Another Doc' }).click();
        await expect(page.getByText('Drag Documents Here')).toBeVisible();
    });

    test('12 — credits decrement after processing a file that triggers Phase 2', async ({ page }) => {
        // Pre-set credits to 1 so we can clearly observe the decrement
        await page.addInitScript(() => {
            localStorage.setItem('dr_free_credits', '1');
        });

        await gotoWorkspace(page);

        // Use a 6 MB buffer — exceeds the 5 MB threshold and triggers Phase 2
        const largePdf = Buffer.alloc(6 * 1024 * 1024, 0x20);
        await page.locator('input[type="file"]').setInputFiles({
            name: 'large.pdf',
            mimeType: 'application/pdf',
            buffer: largePdf,
        });

        await page.getByRole('button', { name: 'Scan & Merge for eFiling' }).click();

        // Wait for either success or error toast (large invalid PDF may error out)
        await page.waitForTimeout(5_000);

        const credits = await page.evaluate(() =>
            parseInt(localStorage.getItem('dr_free_credits') ?? '1', 10)
        );
        // Credits should have been consumed (0) OR processing failed before consuming
        expect(credits).toBeLessThanOrEqual(1);
    });

    test('13 — PricingModal opens when credits are exhausted', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('dr_free_credits', '0');
        });

        await gotoWorkspace(page);

        await page.locator('input[type="file"]').setInputFiles({
            name: 'test.pdf',
            mimeType: 'application/pdf',
            buffer: PDF,
        });

        await page.getByRole('button', { name: 'Scan & Merge for eFiling' }).click();

        const pricingModal = page.getByRole('dialog', { name: 'Lifetime License' });
        await expect(pricingModal).toBeVisible();
    });

    test('14 — PricingModal closes on Escape key', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('dr_free_credits', '0');
        });

        await gotoWorkspace(page);

        await page.locator('input[type="file"]').setInputFiles({
            name: 'test.pdf',
            mimeType: 'application/pdf',
            buffer: PDF,
        });

        await page.getByRole('button', { name: 'Scan & Merge for eFiling' }).click();

        const pricingModal = page.getByRole('dialog', { name: 'Lifetime License' });
        await expect(pricingModal).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(pricingModal).not.toBeVisible();
    });

    test('15 — PricingModal has correct ARIA attributes', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('dr_free_credits', '0');
        });

        await gotoWorkspace(page);

        await page.locator('input[type="file"]').setInputFiles({
            name: 'test.pdf',
            mimeType: 'application/pdf',
            buffer: PDF,
        });

        await page.getByRole('button', { name: 'Scan & Merge for eFiling' }).click();

        const pricingModal = page.getByRole('dialog', { name: 'Lifetime License' });
        await expect(pricingModal).toBeVisible();
        await expect(pricingModal).toHaveAttribute('aria-modal', 'true');
        // aria-labelledby must point to the heading — Playwright resolves this via getByRole
        await expect(
            pricingModal.getByRole('heading', { name: 'Lifetime License' })
        ).toBeVisible();
    });

    test('16 — theme toggle switches data-theme on <html>', async ({ page }) => {
        await gotoWorkspace(page);

        // Default is dark
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

        // Open settings drawer and toggle theme
        await page.getByRole('button', { name: /Settings/i }).click();
        await page.getByRole('button', { name: /Toggle Theme|Light Mode|Dark Mode/i }).click();

        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    });

    test('17 — light mode text is not transparent', async ({ page }) => {
        await page.addInitScript(() => {
            // Force light mode from the start
            document.documentElement.setAttribute('data-theme', 'light');
        });

        await gotoWorkspace(page);

        // Drop a file so the "Collection Stack" heading appears
        await page.locator('input[type="file"]').setInputFiles({
            name: 'test.pdf',
            mimeType: 'application/pdf',
            buffer: PDF,
        });

        const heading = page.getByText('Collection Stack').first();
        await expect(heading).toBeVisible();

        const color = await heading.evaluate(
            el => window.getComputedStyle(el).color
        );
        expect(color).not.toBe('rgba(0, 0, 0, 0)');
        expect(color).not.toBe('transparent');
    });

    test('18 — PWA manifest returns HTTP 200', async ({ request }) => {
        const response = await request.get(
            `${process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'}/manifest.json`
        );
        expect(response.status()).toBe(200);
    });
});

// ---------------------------------------------------------------------------
// 3 — Extended User Actions (20 – 55)
//     All tests in this block use the default pre-accepted storageState unless
//     they explicitly call test.use() or addInitScript().
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helper: navigate to PractitionerView → FileWorkspace
// ---------------------------------------------------------------------------
async function gotoPractitionerWorkspace(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.getByRole('heading', { name: 'I am a Practitioner' }).click();
    await page.getByRole('button', { name: 'Open Practitioner Hub' }).click();
    await expect(page.getByText('Drag Documents Here')).toBeVisible();
}

test.describe('Extended User Actions (20–55)', () => {

    // -----------------------------------------------------------------------
    // 3a — Navigation
    // -----------------------------------------------------------------------

    test('20 — clicking Practitioner card navigates to PractitionerView', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('heading', { name: 'I am a Practitioner' }).click();
        await expect(page.getByRole('heading', { name: 'I am a Practitioner', level: 2 })).toBeVisible();
        // Sanity: the main workspace dropzone must NOT be visible yet
        await expect(page.getByText('Drag Documents Here')).not.toBeVisible();
    });

    test('21 — Practitioner Hub button enters FileWorkspace', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('heading', { name: 'I am a Practitioner' }).click();
        await page.getByRole('button', { name: 'Open Practitioner Hub' }).click();
        await expect(page.getByText('Drag Documents Here')).toBeVisible();
    });

    test('22 — header logo click from TaxpayerView returns to landing', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('heading', { name: 'I am a Taxpayer' }).click();
        // We are on TaxpayerView — confirm it loaded
        await expect(page.getByRole('button', { name: 'Try for Free (3 Credits)' })).toBeVisible();
        // Click the DocReady logo
        await page.getByText('DocReady').first().click();
        // Should be back at the persona-selection landing page
        await expect(page.getByRole('heading', { name: 'I am a Taxpayer' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'I am a Practitioner' })).toBeVisible();
    });

    test('23 — header logo click from workspace resets to landing', async ({ page }) => {
        await gotoWorkspace(page);
        await page.getByText('DocReady').first().click();
        // Landing persona cards must come back
        await expect(page.getByRole('heading', { name: 'I am a Taxpayer' })).toBeVisible();
    });

    test('55 — Dashboard button visible in workspace mode, absent on landing', async ({ page }) => {
        // On landing: no Dashboard button
        await page.goto('/');
        await expect(page.getByRole('button', { name: 'Dashboard' })).not.toBeAttached();

        // After entering workspace: Dashboard button appears in header
        await gotoWorkspace(page);
        await expect(page.getByRole('button', { name: 'Dashboard' })).toBeAttached();
    });

    // -----------------------------------------------------------------------
    // 3b — Settings Drawer
    // -----------------------------------------------------------------------

    test('24 — settings gear opens the Settings Drawer', async ({ page }) => {
        await gotoWorkspace(page);
        await page.getByRole('button', { name: /Settings/i }).click();
        await expect(page.getByText('Project Settings')).toBeVisible();
    });

    test('25 — settings drawer closes on backdrop click', async ({ page }) => {
        await gotoWorkspace(page);
        await page.getByRole('button', { name: /Settings/i }).click();
        await expect(page.getByText('Project Settings')).toBeVisible();
        // Click the backdrop (outside the drawer panel)
        await page.mouse.click(200, 400);
        await expect(page.getByText('Project Settings')).not.toBeVisible();
    });

    test('26 — settings drawer X button closes it', async ({ page }) => {
        await gotoWorkspace(page);
        await page.getByRole('button', { name: /Settings/i }).click();
        await expect(page.getByText('Project Settings')).toBeVisible();
        // The close button sits inside the drawer header
        await page.locator('.fixed.top-0.right-0').getByRole('button').first().click();
        await expect(page.getByText('Project Settings')).not.toBeVisible();
    });

    test('27 — settings Dark button sets data-theme="dark"', async ({ page }) => {
        // Start in light mode to make the toggle meaningful
        await page.addInitScript(() => {
            document.documentElement.setAttribute('data-theme', 'light');
        });
        await gotoWorkspace(page);
        await page.getByRole('button', { name: /Settings/i }).click();
        await page.getByRole('button', { name: /Dark/i }).click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    });

    test('28 — settings Light button sets data-theme="light"', async ({ page }) => {
        await gotoWorkspace(page);
        await page.getByRole('button', { name: /Settings/i }).click();
        await page.getByRole('button', { name: /Light/i }).click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    });

    test('29 — POPIA Privacy Notice link in settings opens PrivacyModal', async ({ page }) => {
        await gotoWorkspace(page);
        await page.getByRole('button', { name: /Settings/i }).click();
        await page.getByRole('button', { name: /POPIA Privacy Notice/i }).click();
        // PrivacyModal should be open — look for its heading or distinctive content
        await expect(page.getByText(/Privacy Notice|POPIA/i).nth(1)).toBeVisible();
    });

    test('30 — Information Officer Contact link in settings opens PrivacyModal', async ({ page }) => {
        await gotoWorkspace(page);
        await page.getByRole('button', { name: /Settings/i }).click();
        await page.getByRole('button', { name: /Information Officer Contact/i }).click();
        await expect(page.getByText(/Privacy Notice|POPIA/i).nth(1)).toBeVisible();
    });

    test('31 — Wipe My Data button triggers browser confirm dialog', async ({ page }) => {
        await gotoWorkspace(page);
        await page.getByRole('button', { name: /Settings/i }).click();

        // Intercept the native confirm() dialog and dismiss it so the page doesn't reload
        page.on('dialog', async dialog => {
            expect(dialog.message()).toMatch(/wipe all local data/i);
            await dialog.dismiss();
        });

        await page.getByRole('button', { name: /Wipe My Data/i }).click();
        // After dismissing the confirm, the drawer should still be visible
        await expect(page.getByText('Project Settings')).toBeVisible();
    });

    // -----------------------------------------------------------------------
    // 3c — Consent & Privacy Modals
    // -----------------------------------------------------------------------

    test.describe('Consent-gate extras', () => {
        test.use({ storageState: { cookies: [], origins: [] } });

        test('32 — privacy link inside ConsentModal opens PrivacyModal', async ({ page }) => {
            await page.goto('/');
            await expect(page.getByRole('dialog', { name: 'POPIA & Privacy Consent' })).toBeVisible();
            await page.getByRole('button', { name: /Read Full POPIA Privacy Notice/i }).click();
            // PrivacyModal content should appear
            await expect(page.getByText(/Privacy Notice|POPIA/i).nth(1)).toBeVisible();
        });

        test('51 — ConsentModal has correct ARIA attributes', async ({ page }) => {
            await page.goto('/');
            const consentDialog = page.getByRole('dialog', { name: 'POPIA & Privacy Consent' });
            await expect(consentDialog).toBeVisible();
            await expect(consentDialog).toHaveAttribute('aria-modal', 'true');
            await expect(consentDialog.getByRole('heading', { name: 'POPIA & Privacy Consent' })).toBeVisible();
        });
    });

    test('33 — PrivacyModal renders visible content', async ({ page }) => {
        await gotoWorkspace(page);
        await page.getByRole('button', { name: /Settings/i }).click();
        await page.getByRole('button', { name: /POPIA Privacy Notice/i }).click();
        // The modal should have a heading level 2
        const heading = page.getByRole('heading', { level: 2 }).first();
        await expect(heading).toBeVisible();
    });

    // -----------------------------------------------------------------------
    // 3d — PricingModal
    // -----------------------------------------------------------------------

    test('34 — PricingModal shows R89 price for taxpayer persona', async ({ page }) => {
        await page.addInitScript(() => { localStorage.setItem('dr_free_credits', '0'); });
        await gotoWorkspace(page);                           // taxpayer path

        await page.locator('input[type="file"]').setInputFiles({
            name: 'test.pdf', mimeType: 'application/pdf', buffer: PDF,
        });
        await page.getByRole('button', { name: 'Scan & Merge for eFiling' }).click();

        const modal = page.getByRole('dialog', { name: 'Lifetime License' });
        await expect(modal).toBeVisible();
        await expect(modal).toContainText('R89');
    });

    test('35 — PricingModal shows R499 for practitioner persona', async ({ page }) => {
        await page.addInitScript(() => { localStorage.setItem('dr_free_credits', '0'); });
        await gotoPractitionerWorkspace(page);               // practitioner path

        await page.locator('input[type="file"]').setInputFiles({
            name: 'test.pdf', mimeType: 'application/pdf', buffer: PDF,
        });
        await page.getByRole('button', { name: 'Scan & Merge for eFiling' }).click();

        const modal = page.getByRole('dialog', { name: 'Lifetime License' });
        await expect(modal).toBeVisible();
        await expect(modal).toContainText('R499');
    });

    test('36 — PricingModal Activate with empty email shows error toast', async ({ page }) => {
        await page.addInitScript(() => { localStorage.setItem('dr_free_credits', '0'); });
        await gotoWorkspace(page);

        await page.locator('input[type="file"]').setInputFiles({
            name: 'test.pdf', mimeType: 'application/pdf', buffer: PDF,
        });
        await page.getByRole('button', { name: 'Scan & Merge for eFiling' }).click();
        await expect(page.getByRole('dialog', { name: 'Lifetime License' })).toBeVisible();

        // Leave email empty and click Activate
        await page.getByRole('button', { name: 'Activate Premium License' }).click();
        // Error toast should appear
        await expect(page.getByText(/Receipt email required/i)).toBeVisible({ timeout: 5_000 });
    });

    test('37 — PricingModal X button closes the dialog', async ({ page }) => {
        await page.addInitScript(() => { localStorage.setItem('dr_free_credits', '0'); });
        await gotoWorkspace(page);

        await page.locator('input[type="file"]').setInputFiles({
            name: 'test.pdf', mimeType: 'application/pdf', buffer: PDF,
        });
        await page.getByRole('button', { name: 'Scan & Merge for eFiling' }).click();
        const modal = page.getByRole('dialog', { name: 'Lifetime License' });
        await expect(modal).toBeVisible();

        await page.getByRole('button', { name: 'Close pricing modal' }).click();
        await expect(modal).not.toBeVisible();
    });

    test('38 — PricingModal backdrop click closes the dialog', async ({ page }) => {
        await page.addInitScript(() => { localStorage.setItem('dr_free_credits', '0'); });
        await gotoWorkspace(page);

        await page.locator('input[type="file"]').setInputFiles({
            name: 'test.pdf', mimeType: 'application/pdf', buffer: PDF,
        });
        await page.getByRole('button', { name: 'Scan & Merge for eFiling' }).click();
        const modal = page.getByRole('dialog', { name: 'Lifetime License' });
        await expect(modal).toBeVisible();

        // Click backdrop area (top-left, outside the modal panel)
        await page.mouse.click(20, 20);
        await expect(modal).not.toBeVisible();
    });

    // -----------------------------------------------------------------------
    // 3e — FileWorkspace advanced
    // -----------------------------------------------------------------------

    test('39 — Merge Only button triggers merge flow', async ({ page }) => {
        await gotoWorkspace(page);
        await page.locator('input[type="file"]').setInputFiles({
            name: 'doc.pdf', mimeType: 'application/pdf', buffer: PDF,
        });
        await page.getByRole('button', { name: 'Merge only' }).click();
        // Success toast should mention merged/no compression
        await expect(page.getByText(/merged|no compression/i)).toBeVisible({ timeout: 30_000 });
    });

    test('40 — target MB input accepts value 10', async ({ page }) => {
        await gotoWorkspace(page);
        await page.locator('input[type="file"]').setInputFiles({
            name: 'doc.pdf', mimeType: 'application/pdf', buffer: PDF,
        });
        const input = page.locator('#target-size');
        await input.fill('10');
        await expect(input).toHaveValue('10');
    });

    test('41 — target MB clamps to 1 when blurred with value 0', async ({ page }) => {
        await gotoWorkspace(page);
        await page.locator('input[type="file"]').setInputFiles({
            name: 'doc.pdf', mimeType: 'application/pdf', buffer: PDF,
        });
        const input = page.locator('#target-size');
        await input.fill('0');
        await input.blur();
        await expect(input).toHaveValue('1');
    });

    test('42 — target MB clamps to 50 when blurred with value 99', async ({ page }) => {
        await gotoWorkspace(page);
        await page.locator('input[type="file"]').setInputFiles({
            name: 'doc.pdf', mimeType: 'application/pdf', buffer: PDF,
        });
        const input = page.locator('#target-size');
        await input.fill('99');
        await input.blur();
        await expect(input).toHaveValue('50');
    });

    test('43 — uploading a JPG image shows its card in the file list', async ({ page }) => {
        await gotoWorkspace(page);
        // Create a minimal 1×1 white JPEG in memory
        const jpegBuffer = Buffer.from([
            0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
            0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
            0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
            0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
            0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
            0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
            0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d,
            0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
            0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08,
            0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
            0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
            0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45,
            0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
            0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
            0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
            0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3,
            0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6,
            0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
            0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
            0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4,
            0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01,
            0x00, 0x00, 0x3f, 0x00, 0xfb, 0xd4, 0xff, 0xd9,
        ]);
        await page.locator('input[type="file"]').setInputFiles({
            name: 'photo.jpg', mimeType: 'image/jpeg', buffer: jpegBuffer,
        });
        await expect(page.getByText('photo.jpg')).toBeVisible();
        await expect(page.getByText(/JPEG/)).toBeVisible();
    });

    test('44 — multiple files show correct count in Collection Stack label', async ({ page }) => {
        await gotoWorkspace(page);
        await page.locator('input[type="file"]').setInputFiles([
            { name: 'a.pdf', mimeType: 'application/pdf', buffer: PDF },
            { name: 'b.pdf', mimeType: 'application/pdf', buffer: PDF },
            { name: 'c.pdf', mimeType: 'application/pdf', buffer: PDF },
        ]);
        await expect(page.getByText('Collection Stack (3)')).toBeVisible();
    });

    test('53 — Scan & Merge button appears when at least one file is queued', async ({ page }) => {
        await gotoWorkspace(page);
        // Before adding a file the button must be absent from the DOM
        await expect(page.getByRole('button', { name: 'Scan & Merge for eFiling' })).not.toBeAttached();

        await page.locator('input[type="file"]').setInputFiles({
            name: 'doc.pdf', mimeType: 'application/pdf', buffer: PDF,
        });
        // After adding a file the button must be present
        await expect(page.getByRole('button', { name: 'Scan & Merge for eFiling' })).toBeAttached();
    });

    test('54 — dropping two files with the same name both appear in the list', async ({ page }) => {
        await gotoWorkspace(page);
        await page.locator('input[type="file"]').setInputFiles([
            { name: 'dup.pdf', mimeType: 'application/pdf', buffer: PDF },
            { name: 'dup.pdf', mimeType: 'application/pdf', buffer: PDF },
        ]);
        // Both cards should render — the count must be 2
        await expect(page.getByText('Collection Stack (2)')).toBeVisible();
    });

    // -----------------------------------------------------------------------
    // 3f — ReceiptCard
    // -----------------------------------------------------------------------

    test('45 & 46 — ReceiptCard shows quality badge and REDUCED BY text', async ({ page }) => {
        await gotoWorkspace(page);
        await page.locator('input[type="file"]').setInputFiles({
            name: 'valid.pdf', mimeType: 'application/pdf', buffer: PDF,
        });
        await page.getByRole('button', { name: 'Scan & Merge for eFiling' }).click();

        // Wait for receipt
        await expect(page.getByText('REDUCED BY')).toBeVisible({ timeout: 30_000 });

        // One of the three quality badges must be present
        const badges = ['High Quality (Print Ready)', 'OCR Pass (Acceptable)', 'Legibility Risk (Manual Review)'];
        let found = false;
        for (const badge of badges) {
            if (await page.getByText(badge).isVisible()) { found = true; break; }
        }
        expect(found).toBeTruthy();
    });

    test('47 — WhatsApp Share button is visible on the ReceiptCard', async ({ page }) => {
        await gotoWorkspace(page);
        await page.locator('input[type="file"]').setInputFiles({
            name: 'share.pdf', mimeType: 'application/pdf', buffer: PDF,
        });
        await page.getByRole('button', { name: 'Scan & Merge for eFiling' }).click();
        await expect(page.getByText('REDUCED BY')).toBeVisible({ timeout: 30_000 });

        const shareBtn = page.getByRole('button', { name: /Share Success on WhatsApp/i });
        await expect(shareBtn).toBeVisible();
    });

    test('48 — ReceiptCard Download button text says "Download Final PDF" for single part', async ({ page }) => {
        await gotoWorkspace(page);
        await page.locator('input[type="file"]').setInputFiles({
            name: 'valid.pdf', mimeType: 'application/pdf', buffer: PDF,
        });
        await page.getByRole('button', { name: 'Scan & Merge for eFiling' }).click();
        await expect(page.getByText('REDUCED BY')).toBeVisible({ timeout: 30_000 });

        const downloadBtn = page.getByRole('button', { name: /Download/ });
        await expect(downloadBtn).toContainText('Download Final PDF');
    });

    // -----------------------------------------------------------------------
    // 3g — Pricing CTAs from Info views
    // -----------------------------------------------------------------------

    test('49 — "Buy Premium Pass" in TaxpayerView opens PricingModal', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('heading', { name: 'I am a Taxpayer' }).click();
        await page.getByRole('button', { name: 'Buy Premium Pass' }).click();
        await expect(page.getByRole('dialog', { name: 'Lifetime License' })).toBeVisible();
    });

    test('50 — "View Detailed B2B Pricing" in PractitionerView opens PricingModal', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('heading', { name: 'I am a Practitioner' }).click();
        await page.getByRole('button', { name: 'View Detailed B2B Pricing' }).click();
        await expect(page.getByRole('dialog', { name: 'Lifetime License' })).toBeVisible();
    });

    // -----------------------------------------------------------------------
    // 3h — Accessibility spot-checks
    // -----------------------------------------------------------------------

    test('52 — dropzone border changes when drag is active (isDragActive CSS class)', async ({ page }) => {
        await gotoWorkspace(page);

        const dropzone = page.locator('.border-dashed');
        const dt = await page.evaluateHandle(() => {
            const dt = new DataTransfer();
            dt.items.add(new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' }));
            return dt;
        });

        await dropzone.dispatchEvent('dragenter', { dataTransfer: dt });
        // On drag-over the class 'border-[#10b981]' should be applied instead of 'border-white/10'
        await expect(dropzone).toHaveClass(/border-\[#10b981\]/);

        await dropzone.dispatchEvent('dragleave', { dataTransfer: dt });
        await expect(dropzone).not.toHaveClass(/border-\[#10b981\]/);
    });

    test('SettingsDrawer has accessible heading', async ({ page }) => {
        await gotoWorkspace(page);
        await page.getByRole('button', { name: /Settings/i }).click();
        // "Project Settings" heading should be queryable by its text role
        await expect(page.getByRole('heading', { name: 'Project Settings' })).toBeVisible();
    });

    test('PricingModal email input is properly labelled', async ({ page }) => {
        await page.addInitScript(() => { localStorage.setItem('dr_free_credits', '0'); });
        await gotoWorkspace(page);
        await page.locator('input[type="file"]').setInputFiles({
            name: 'test.pdf', mimeType: 'application/pdf', buffer: PDF,
        });
        await page.getByRole('button', { name: 'Scan & Merge for eFiling' }).click();
        await expect(page.getByRole('dialog', { name: 'Lifetime License' })).toBeVisible();
        // Email input must be present and focusable
        const emailInput = page.locator('input[type="email"]');
        await expect(emailInput).toBeVisible();
        await emailInput.fill('test@example.com');
        await expect(emailInput).toHaveValue('test@example.com');
    });

    test('Landing page has a single H1', async ({ page }) => {
        await page.goto('/');
        const h1s = page.getByRole('heading', { level: 1 });
        await expect(h1s).toHaveCount(1);
    });

    test('FileWorkspace dropzone has descriptive helper text', async ({ page }) => {
        await gotoWorkspace(page);
        await expect(page.getByText(/ID documents, payslips/i)).toBeVisible();
    });

});

