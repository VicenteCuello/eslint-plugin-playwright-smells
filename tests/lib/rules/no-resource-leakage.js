"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-resource-leakage");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-resource-leakage", rule, {
  valid: [
    {
      name: "Solution: Close the base application (Electron, Custom Context)",
      code: `
        test.afterAll(async () => {
          await electronApp.close();
        });
      `,
    },
    {
      name: "Solution: Close the main browser",
      code: `
        test.afterEach(async () => {
          await browser.close();
        });
      `,
    },
    {
      name: "Valid use: Closing a page in the middle of a test (not in the teardown)",
      code: `
        test('Validation flow', async ({ page }) => {
          const popup = await page.waitForEvent('popup');
          await popup.close(); // Valid because it is part of the test's business logic
        });
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Superficially closing the page in afterEach",
      code: `
        test.afterEach(async () => {
          await newPage.close();
        });
      `,
      errors: [{ messageId: "resourceLeakage", data: { name: "newPage" } }]
    },
    {
      name: "Code smell: Superficially closing a popup in afterAll",
      code: `
        test.afterAll(async () => {
          await authWindow.close();
        });
      `,
      errors: [{ messageId: "resourceLeakage", data: { name: "authWindow" } }]
    }
  ]
});