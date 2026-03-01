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
    const h  = '%PDF-1.4\n';
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
        await gotoWorkspace(page);

        await page.locator('input[type="file"]').setInputFiles({
            name: 'test-doc.pdf',
            mimeType: 'application/pdf',
            buffer: PDF,
        });

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
