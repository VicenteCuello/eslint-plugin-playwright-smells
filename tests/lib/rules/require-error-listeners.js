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
        import { test } from '@playwright/test';
        
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
        import { test } from '@playwright/test';

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
        import { test, expect } from '@playwright/test';

        test('Pure visual validation flow', async ({ page }) => {
          await page.goto('/dashboard');
          await expect(page.locator('.widget')).toBeVisible();
        });
      `,
      errors: [{ messageId: "missingListeners" }]
    }
  ]
});