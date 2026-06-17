"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/require-error-listeners");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("require-error-listeners", rule, {
  valid: [
    {
      name: "Solution: File with page error listener configured in beforeEach",
      code: `
        test.beforeEach(async ({ page }) => {
          page.on('pageerror', err => { throw err; });
        });

        test('scenario 1', async ({ page }) => {
          await page.goto('/app');
        });
      `,
    },
    {
      name: "Solution: File with console listener",
      code: `
        test('isolated scenario', async ({ page }) => {
          page.on('console', msg => { if(msg.type() === 'error') throw new Error(msg.text()); });
          await page.goto('/app');
        });
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: File with tests but blind to network and console",
      code: `
        test('Pure visual validation flow', async ({ page }) => {
          await page.goto('/dashboard');
          await expect(page.locator('.widget')).toBeVisible();
        });
      `,
      errors: [{ messageId: "missingListeners" }]
    }
  ]
});