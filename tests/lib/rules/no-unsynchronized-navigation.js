"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-unsynchronized-navigation");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-unsynchronized-navigation", rule, {
  valid: [
    {
      name: "Solution: Explicitly validate the URL state change",
      code: `
        async function test() {
          await page.click('a[href="/dashboard"]'); 
          await page.waitForURL('**/dashboard'); 
          await expect(page.locator('.widget')).toBeVisible();
        }
      `,
    },
    {
      name: "Valid use: Click on a normal button that does not navigate (no href)",
      code: `
        async function test() {
          await page.locator('#abrir-modal').click();
          await expect(page.locator('.modal')).toBeVisible();
        }
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: The test assumes it is already on the new page immediately",
      code: `
        async function test() {
          await page.click('a[href="/dashboard"]');
          await expect(page.locator('.widget')).toBeVisible();
        }
      `,
      errors: [
        { 
          messageId: "unsynchronizedNav",
          suggestions: [
            {
              messageId: "addWaitForURL",
              output: `
        async function test() {
          await page.click('a[href="/dashboard"]');
          await page.waitForURL('**/YOUR_URL_HERE');
          await expect(page.locator('.widget')).toBeVisible();
        }
      `
            }
          ]
        }
      ]
    }
  ]
});