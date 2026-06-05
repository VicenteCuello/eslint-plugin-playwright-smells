"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-unjustified-force");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-unjustified-force", rule, {
  valid: [
    {
      name: "Solution: Validate the UI naturally before interacting",
      code: `
        async function test() {
          await expect(locator).toBeVisible(); 
          await locator.click();
        }
      `,
    },
    {
      name: "Valid use of options without force",
      code: `
        async function test() {
          await locator.click({ timeout: 5000, delay: 100 });
        }
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Forcing a click skipping the state check",
      code: `
        async function test() {
          await locator.click({ force: true });
        }
      `,
      errors: [
        { 
          messageId: "unjustifiedForce",
          suggestions: [
            {
              messageId: "removeForce",
              output: `
        async function test() {
          await locator.click({  });
        }
      `
            },
            // NEW: Validate that it injects the expect() using the same variable
            {
              messageId: "replaceWithExpect",
              output: `
        async function test() {
          await expect(locator).toBeVisible();
          await locator.click();
        }
      `
            }
          ]
        }
      ],
    },
    {
      name: "Code smell: force: true combined with a complex locator",
      code: `
        async function test() {
          await page.getByRole('button').click({ force: true });
        }
      `,
      errors: [
        { 
          messageId: "unjustifiedForce",
          suggestions: [
            {
              messageId: "removeForce",
              output: `
        async function test() {
          await page.getByRole('button').click({  });
        }
      `
            },
            // NEW: Validate that it correctly extracts a complex locator
            {
              messageId: "replaceWithExpect",
              output: `
        async function test() {
          await expect(page.getByRole('button')).toBeVisible();
          await page.getByRole('button').click();
        }
      `
            }
          ]
        }
      ],
    }
  ],
});