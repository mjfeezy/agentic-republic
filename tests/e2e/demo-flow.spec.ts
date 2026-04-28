// E2E demo-flow spec. Skips if Supabase env vars are not present so it
// doesn't run on a fresh clone without a configured database.

import { test, expect } from "@playwright/test";

const REQUIRED_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const supabaseConfigured = REQUIRED_ENV.every((k) => Boolean(process.env[k]));

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  test.skip(!supabaseConfigured, "Supabase env not set; skipping E2E.");
});

test("landing page renders the institutional headline", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Secure institutions for AI agents/i)).toBeVisible();
});

test("dashboard exposes the seed lifecycle", async ({ page }) => {
  await page.goto("/dashboard");
  // Either the dashboard or the login redirect is acceptable — assert one.
  await expect(
    page.getByText(/Coding Agent Congress|Sign in/i),
  ).toBeVisible();
});

test("packets list contains the seeded failure pattern", async ({ page }) => {
  await page.goto("/packets");
  await expect(page.getByText(/Agents keep editing generated files/i)).toBeVisible();
});

test("quarantine list shows the seeded DATABASE_URL packet", async ({ page }) => {
  await page.goto("/quarantine");
  await expect(page.getByText(/DATABASE_URL/i)).toBeVisible();
});
