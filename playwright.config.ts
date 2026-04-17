import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',

    // Generates e2e/storageState.json before any tests run:
    // sets dr_consent_accepted=true in localStorage.
    // Consent-gate tests override this with an empty storageState via test.use().
    globalSetup: './e2e/global-setup.ts',

    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
        // Most tests start with consent already accepted.
        // Consent-gate tests override this with an empty origin state.
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

    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        env: {
            FRONTEND_APP_URL: 'http://localhost:3000',
            VITE_API_BASE_URL: 'http://localhost:3000',
            PAYSTACK_CALLBACK_URL: 'http://localhost:3000/payment/callback',
            DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/docready',
            PAYSTACK_SECRET_KEY: 'secret',
            VITE_SUPABASE_URL: 'https://example.supabase.co',
            VITE_SUPABASE_ANON_KEY: 'anon',
            SUPABASE_SERVICE_ROLE_KEY: 'service-role',
            VITE_PAYSTACK_PUBLIC_KEY: 'pk_test_placeholder',
        },
        reuseExistingServer: !process.env.CI,
    },
});
