"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-inline-timeout");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-inline-timeout", rule, {
  valid: [
    {
      name: "Solution 1: Rely on the global timeout without overrides",
      code: `
        async function test() {
          await expect(page.getByRole('heading')).toBeVisible();
          await page.waitForURL('**/dashboard');
        }
      `,
    },
    {
      name: "Solution 2: Semantic declaration for heavy tests",
      code: `
        test('Heavy report test', async ({ page }) => {
          test.slow();
        });
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Inline Timeout in expect",
      code: `
        async function test() {
          await expect(locator).toBeVisible({ timeout: 15000 });
        }
      `,
      errors: [
        { 
          messageId: "inlineTimeout",
          suggestions: [
            {
              messageId: "removeTimeoutProp",
              output: `
        async function test() {
          await expect(locator).toBeVisible({  });
        }
      `
            }
          ]
        }
      ]
    },
    {
      name: "Code smell: Test Timeout Inflation at the test level",
      code: `
        test('Flaky test', async ({ page }) => {
          test.setTimeout(90000);
        });
      `,
      errors: [
        { 
          messageId: "testSetTimeout",
          suggestions: [
            {
              messageId: "replaceWithSlow",
              output: `
        test('Flaky test', async ({ page }) => {
          test.slow();
        });
      `
            }
          ]
        }
      ]
    }
  ]
});