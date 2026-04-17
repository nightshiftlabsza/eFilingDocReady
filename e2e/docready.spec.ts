import { expect, test } from '@playwright/test';

function makeMinimalPdf(): Buffer {
    const header = '%PDF-1.4\n';
    const obj1 = '1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n';
    const obj2 = '2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n';
    const obj3 = '3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 300 300]>>\nendobj\n';

    const offset1 = header.length;
    const offset2 = offset1 + obj1.length;
    const offset3 = offset2 + obj2.length;
    const xrefStart = offset3 + obj3.length;
    const pad = (value: number) => String(value).padStart(10, '0');

    const xref =
        `xref\n0 4\n` +
        `0000000000 65535 f \n` +
        `${pad(offset1)} 00000 n \n` +
        `${pad(offset2)} 00000 n \n` +
        `${pad(offset3)} 00000 n \n` +
        `trailer\n<</Root 1 0 R /Size 4>>\n` +
        `startxref\n${xrefStart}\n%%EOF\n`;

    return Buffer.from(header + obj1 + obj2 + obj3 + xref);
}

function makeMinimalPng(): Buffer {
    return Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn7V6kAAAAASUVORK5CYII=',
        'base64',
    );
}

const SAMPLE_PDF = makeMinimalPdf();
const SAMPLE_PNG = makeMinimalPng();

async function openWorkspace(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start as Taxpayer' }).click();
    await page.getByRole('button', { name: 'Open Workspace' }).click();
    await expect(page.getByText('Drag Documents Here')).toBeVisible();
}

test.describe('Consent Gate', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('shows the consent modal on first visit', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('dialog', { name: 'POPIA & Privacy Consent' })).toBeVisible();
        await expect(page.getByText('Drag Documents Here')).not.toBeVisible();
    });

    test('accepting consent returns the user to the launch homepage', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: 'I Accept & Continue' }).click();
        await expect(page.getByRole('heading', { name: /Prepare supporting documents/i })).toBeVisible();
    });
});

test.describe('Launch Smoke', () => {
    test('homepage shows the truthful launch pricing and legal links', async ({ page }) => {
        await page.goto('/');

        await expect(page.getByRole('heading', { name: /Prepare supporting documents/i })).toBeVisible();
        await expect(page.getByText('South Africa only')).toBeVisible();
        await expect(page.getByText('Files processed in your browser')).toBeVisible();
        await expect(page.getByText('Supported file types')).toBeVisible();
        await expect(page.getByText('Taxpayer Pass: R49 once-off')).toBeVisible();
        await expect(page.getByText('Practitioner Pass: R399 once-off')).toBeVisible();
        await expect(page.getByText('Not affiliated with SARS.', { exact: true })).toBeVisible();

        for (const label of ['Terms', 'Privacy', 'Refunds', 'Contact', 'POPIA', 'PAIA']) {
            await expect(page.getByRole('link', { name: label })).toBeVisible();
        }
    });

    test('file processing happy path merges a PDF and PNG without upload', async ({ page }) => {
        await openWorkspace(page);

        await page.locator('input[type="file"]').setInputFiles([
            { name: 'supporting-doc.pdf', mimeType: 'application/pdf', buffer: SAMPLE_PDF },
            { name: 'supporting-image.png', mimeType: 'image/png', buffer: SAMPLE_PNG },
        ]);

        await expect(page.getByText('Collection Stack (2)')).toBeVisible({ timeout: 15000 });
        await expect(page.getByLabel('Remove supporting_doc.pdf')).toBeAttached({ timeout: 15000 });
        await expect(page.getByLabel('Remove supporting_image.png')).toBeAttached({ timeout: 15000 });

        await page.getByRole('button', { name: /Merge only \(no compression\)/i }).click();

        await expect(page.getByText(/Done!/i)).toBeVisible({ timeout: 30000 });
        await expect(page.getByText('Input Size')).toBeVisible({ timeout: 30000 });
        await expect(page.getByRole('button', { name: /Download/i })).toBeVisible();
    });
});
