import { chromium, type FullConfig } from '@playwright/test';

/**
 * Runs once before the entire test suite.
 * Navigates to the app, pre-accepts the consent modal and sets free credits
 * to 3, then saves the resulting localStorage as storageState.json.
 *
 * Most tests inherit this state automatically via playwright.config.ts
 * `use.storageState`. The Consent Gate describe block overrides it with
 * an empty origin state to test the unauthenticated flow.
 */
async function globalSetup(config: FullConfig) {
    const { baseURL } = config.projects[0].use;
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto(baseURL!);

    await page.evaluate(() => {
        localStorage.setItem('dr_consent_accepted', 'true');
        localStorage.setItem('dr_free_credits', '3');
    });

    await page.context().storageState({ path: 'e2e/storageState.json' });
    await browser.close();
}

export default globalSetup;
