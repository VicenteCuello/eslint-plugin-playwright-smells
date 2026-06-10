"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-meaningless-assertions");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-meaningless-assertions", rule, {
  valid: [
    {
      name: "Solution: Assert the visibility of a root element",
      code: `async function test() { await expect(page.locator('#app')).toBeVisible(); }`,
    },
    {
      name: "Valid use: Truthy assertion on a real boolean",
      code: `
        async function test() { 
          const isEnabled = await page.locator('.btn').isEnabled();
          expect(isEnabled).toBeTruthy(); 
        }
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Meaningless assertion that will always pass if Playwright started",
      code: `
        async function test() {
          expect(page).toBeTruthy();
        }
      `,
      errors: [
        { 
          messageId: "meaninglessAssertion",
          suggestions: [
            {
              messageId: "replaceWithVisible",
              output: `
        async function test() {
          await expect(page.locator('#app')).toBeVisible();
        }
      `
            }
          ]
        }
      ]
    },
    {
      name: "Code smell: Meaningless assertion on a Locator",
      code: `
        async function test() {
          expect(page.getByRole('button')).toBeDefined();
        }
      `,
      errors: [
        { 
          messageId: "meaninglessAssertion",
          suggestions: [
            {
              messageId: "replaceWithVisible",
              output: `
        async function test() {
          await expect(page.getByRole('button')).toBeVisible();
        }
      `
            }
          ]
        }
      ]
    }
  ]
});