// ============================================================
//  safora_contact_form.spec.js
//  Playwright Automation – Safora "Contact Us" Form
//  URL: https://safora.se/en/contact.html
// ============================================================

const { test, expect } = require('@playwright/test');

// ── The URL we are testing ──────────────────────────────────
const CONTACT_URL = 'https://safora.se/en/contact.html';

// ── Valid test data ─────────────────────────────────────────
const VALID_DATA = {
  name:    'John Doe',
  email:   'john.doe@example.com',
  phone:   '+46 70 123 4567',
  message: 'Hello, I would like to learn more about Safora and schedule a demo for our organization.',
};


// ============================================================
//  HELPER – navigate to the contact page before every test
// ============================================================
test.beforeEach(async ({ page }) => {
  // Go to the contact page and wait until the network is idle
  await page.goto(CONTACT_URL, { waitUntil: 'networkidle', timeout: 30_000 });

  // Scroll down a bit so dynamic content renders
  await page.evaluate(() => window.scrollBy(0, 400));
  await page.waitForTimeout(800);
});


// ============================================================
//  TEST 1 – Page loads and the form is visible
// ============================================================
test('Contact page loads with form fields visible', async ({ page }) => {

  // The page title should contain "Safora" or "Contact"
  await expect(page).toHaveTitle(/safora|contact/i);

  // The "Get In Touch" heading should be on the page
  const heading = page.getByRole('heading', { name: /get in touch/i });
  await expect(heading).toBeVisible({ timeout: 10_000 });

  // The Name input field should exist
  const nameField = page.locator('input[placeholder*="Name" i], input[name="name"]').first();
  await expect(nameField).toBeVisible();

  // The Email input field should exist
  const emailField = page.locator('input[type="email"], input[placeholder*="Email" i]').first();
  await expect(emailField).toBeVisible();

  // The Message textarea should exist
  const messageField = page.locator('textarea').first();
  await expect(messageField).toBeVisible();

  // The Submit button should exist
  const submitBtn = page.locator('button[type="submit"], button:has-text("Send")').first();
  await expect(submitBtn).toBeVisible();

  // Take a screenshot so you can see the form in the report
  await page.screenshot({ path: 'test-results/01-page-loaded.png' });
});


// ============================================================
//  TEST 2 – Fill all fields with valid data and submit
// ============================================================
test('Fill valid data and submit the form', async ({ page }) => {

  // ── Step 1: Fill the Name field ──
  const nameField = page.locator('input[placeholder*="Name" i], input[name="name"]').first();
  await nameField.fill(VALID_DATA.name);

  // ── Step 2: Fill the Email field ──
  const emailField = page.locator('input[type="email"], input[placeholder*="Email" i]').first();
  await emailField.fill(VALID_DATA.email);

  // ── Step 3: Fill the Phone field (optional – skip if not found) ──
  const phoneField = page.locator('input[type="tel"], input[placeholder*="Phone" i]').first();
  if (await phoneField.count() > 0) {
    await phoneField.fill(VALID_DATA.phone);
  }

  // ── Step 4: Fill the Message field ──
  const messageField = page.locator('textarea').first();
  await messageField.fill(VALID_DATA.message);

  // Screenshot – form filled in, before clicking Send
  await page.screenshot({ path: 'test-results/02-form-filled.png' });

  // ── Step 5: Click the Send Message button ──
  const submitBtn = page.locator('button[type="submit"], button:has-text("Send")').first();
  await submitBtn.click();

  // ── Step 6: Wait and check for a success response ──
  await page.waitForTimeout(3000);

  const successMessage = page.locator([
    '[class*="success"]',
    '[class*="alert"]',
    'text=Thank you',
    'text=successfully',
    'text=received',
    'text=message has been sent',
  ].join(', '));

  const isSuccessVisible = await successMessage.isVisible().catch(() => false);
  const wasRedirected    = page.url() !== CONTACT_URL;

  // Screenshot after submitting
  await page.screenshot({ path: 'test-results/03-after-submit.png' });

  expect(
    isSuccessVisible || wasRedirected,
    `Expected a success message or page redirect after submission. URL: ${page.url()}`,
  ).toBeTruthy();
});


// ============================================================
//  TEST 3 – Submit with ALL fields empty → validation errors
// ============================================================
test('Show validation errors when all fields are empty', async ({ page }) => {

  // Click Submit without filling anything
  const submitBtn = page.locator('button[type="submit"], button:has-text("Send")').first();
  await submitBtn.click();

  await page.waitForTimeout(1000);

  // Page should NOT have moved away from contact page
  expect(page.url()).toContain('contact');

  // Check for browser HTML5 validation (required fields marked :invalid)
  const hasInvalidFields = await page.evaluate(() => {
    return document.querySelectorAll(':invalid').length > 0;
  });

  // OR a custom error message appeared
  const customError    = page.locator('[class*="error"], [class*="alert-danger"]').first();
  const hasCustomError = await customError.isVisible().catch(() => false);

  await page.screenshot({ path: 'test-results/04-empty-validation.png' });

  expect(
    hasInvalidFields || hasCustomError,
    'Expected validation errors when submitting an empty form',
  ).toBeTruthy();
});


// ============================================================
//  TEST 4 – Invalid email format → email error shown
// ============================================================
test('Show validation error for invalid email format', async ({ page }) => {

  const nameField    = page.locator('input[placeholder*="Name" i], input[name="name"]').first();
  const emailField   = page.locator('input[type="email"], input[placeholder*="Email" i]').first();
  const messageField = page.locator('textarea').first();
  const submitBtn    = page.locator('button[type="submit"], button:has-text("Send")').first();

  await nameField.fill('Test User');
  await emailField.fill('notanemail');   // ← invalid – missing @
  await messageField.fill('Testing email validation on the Safora contact form.');
  await submitBtn.click();

  await page.waitForTimeout(1000);

  // The email input should be flagged invalid by the browser
  const emailIsInvalid = await page.evaluate(() => {
    const el = document.querySelector('input[type="email"]');
    return el ? !el.validity.valid : false;
  });

  await page.screenshot({ path: 'test-results/05-invalid-email.png' });

  expect(
    emailIsInvalid,
    'Expected the email field to be invalid when "notanemail" is entered',
  ).toBeTruthy();
});


// ============================================================
//  TEST 5 – Leave Name empty → name field required error
// ============================================================
test('Show validation error when Name field is empty', async ({ page }) => {

  const emailField   = page.locator('input[type="email"], input[placeholder*="Email" i]').first();
  const messageField = page.locator('textarea').first();
  const submitBtn    = page.locator('button[type="submit"], button:has-text("Send")').first();

  // Fill everything EXCEPT name
  await emailField.fill('valid@example.com');
  await messageField.fill('This is a test message to check name field validation.');
  await submitBtn.click();

  await page.waitForTimeout(1000);

  expect(page.url()).toContain('contact');

  const nameIsInvalid = await page.evaluate(() => {
    const el =
      document.querySelector('input[name="name"]') ||
      document.querySelector('input[placeholder*="Name" i]');
    return el ? !el.validity.valid : false;
  });

  await page.screenshot({ path: 'test-results/06-empty-name.png' });

  expect(
    nameIsInvalid,
    'Expected the Name field to be required and block form submission',
  ).toBeTruthy();
});


// ============================================================
//  TEST 6 – Leave Message empty → message field required error
// ============================================================
test('Show validation error when Message field is empty', async ({ page }) => {

  const nameField  = page.locator('input[placeholder*="Name" i], input[name="name"]').first();
  const emailField = page.locator('input[type="email"], input[placeholder*="Email" i]').first();
  const submitBtn  = page.locator('button[type="submit"], button:has-text("Send")').first();

  // Fill Name and Email – leave Message blank
  await nameField.fill('Alice Johnson');
  await emailField.fill('alice@company.com');
  await submitBtn.click();

  await page.waitForTimeout(1000);

  expect(page.url()).toContain('contact');

  const messageIsInvalid = await page.evaluate(() => {
    const el = document.querySelector('textarea');
    return el ? !el.validity.valid : false;
  });

  await page.screenshot({ path: 'test-results/07-empty-message.png' });

  expect(
    messageIsInvalid,
    'Expected the Message field to be required and block form submission',
  ).toBeTruthy();
});


// ============================================================
//  TEST 7 – Contact info details are visible
// ============================================================
test('Contact information details are visible on the page', async ({ page }) => {

  await expect(page.getByText('+46 73 044 58 55')).toBeVisible({ timeout: 10_000 });

  await expect(
    page.locator('text=/info.*safora/i, a[href="mailto:info@safora.se"]').first()
  ).toBeVisible();

  await expect(page.getByText(/umeå/i).first()).toBeVisible();

  await page.screenshot({ path: 'test-results/08-contact-info.png' });
});


// ============================================================
//  TEST 8 – Global branch offices are displayed
// ============================================================
test('Global branch office locations are displayed', async ({ page }) => {

  // Scroll to bottom where offices appear
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);

  await expect(page.getByText(/Finland|Oulu/i).first()).toBeVisible();
  await expect(page.getByText(/Umeå|Sweden/i).first()).toBeVisible();
  await expect(page.getByText(/USA|Sheridan|Wyoming/i).first()).toBeVisible();
  await expect(page.getByText(/Sri Lanka|Nugegoda/i).first()).toBeVisible();

  await page.screenshot({ path: 'test-results/09-branch-offices.png' });
});
