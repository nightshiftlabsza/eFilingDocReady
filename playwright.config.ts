import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',

    // Generates e2e/storageState.json before any tests run:
    // sets dr_consent_accepted=true and dr_free_credits=3 in localStorage.
    // Consent-gate tests override this with an empty storageState via test.use().
    globalSetup: './e2e/global-setup.ts',

    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
        // All tests start with consent already accepted (3 free credits).
        // Consent-gate describe block overrides this with an empty origin state.
        storageState: 'e2e/storageState.json',
        trace: 'on-first-retry',
        viewport: { width: 1280, height: 800 },
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    // Uncomment to spin up the Vite dev server automatically:
    // webServer: {
    //     command: 'npm run dev',
    //     url: 'http://localhost:5173',
    //     reuseExistingServer: !process.env.CI,
    // },
});
