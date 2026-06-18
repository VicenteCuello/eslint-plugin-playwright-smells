"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-hanging-route");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-hanging-route", rule, {
  valid: [
    {
      name: "Solution: Ensure that the flow ends in continue()",
      code: `
        async function test() {
          await page.route('**/api/messages', async route => {
            if (condition) {
              await route.fulfill({ body: 'mock' });
              return;
            }
            await route.continue();
          });
        }
      `,
    },
    {
      name: "Valid use: Exhaustive if/else flow that covers both paths",
      code: `
        async function test() {
          await page.route('**/api/data', async r => {
            if (isInvalid) {
              await r.abort();
            } else {
              await r.fulfill({ json: {} });
            }
          });
        }
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Missing route.continue() for requests that do not meet the condition",
      code: `
        async function test() {
          await page.route('**/api/messages', async route => {
            if (condition) {
              await route.fulfill({ body: 'mock' });
              return;
            }
          });
        }
      `,
      output: `
        async function test() {
          await page.route('**/api/messages', async route => {
            if (condition) {
              await route.fulfill({ body: 'mock' });
              return;
            }
  await route.continue();
          });
        }
      `,
      errors: [{ messageId: "hangingRoute" }]
    }
  ]
});