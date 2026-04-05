import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    // Give Next.js time to respond
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
  },
  env: {
    // Available in tests as Cypress.env('SUPABASE_URL')
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://test.supabase.co',
  },
});
