"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-broad-test-skipping");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-broad-test-skipping", rule, {
  valid: [
    {
      name: "Solution: Conditional skip using project information",
      code: `
        test('Checkout flow', async ({ page }, testInfo) => {
          test.skip(testInfo.project.name === 'firefox', 'Flaky on Firefox');
        });
      `,
    },
    {
      name: "Valid use: Conditional skip using a boolean variable",
      code: `
        test('Mobile flow', async ({ page, isMobile }) => {
          test.skip(!isMobile, 'Test exclusive to mobile devices');
        });
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Entire test skipped unconditionally",
      code: `
        test.skip("test name", async ({ page }) => {
          await page.goto('/home');
        });
      `,
      errors: [{ messageId: "broadSkip" }]
    },
    {
      name: "Code smell: Describe block skipped unconditionally",
      code: `
        test.describe.skip('Unstable module', () => {
          test('test 1', async ({ page }) => {});
        });
      `,
      errors: [{ messageId: "broadSkip" }]
    },
    {
      name: "Code smell: Inline unconditional skip (no arguments)",
      code: `
        test('test name', async ({ page }) => {
          test.skip();
        });
      `,
      errors: [{ messageId: "broadSkip" }]
    },
    {
      name: "Code smell: Inline unconditional skip (only with justification)",
      code: `
        test('test name', async ({ page }) => {
          test.skip('Ignoring for now due to bug #1234');
        });
      `,
      errors: [{ messageId: "broadSkip" }]
    }
  ]
});