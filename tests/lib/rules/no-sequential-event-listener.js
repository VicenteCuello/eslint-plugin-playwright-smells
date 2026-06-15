"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-sequential-event-listener");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-sequential-event-listener", rule, {
  valid: [
    {
      name: "Solution 1: Safe concurrency with Promise.all (As stated by the expert)",
      code: `
        async function test() {
          await Promise.all([
            page.waitForResponse('**/api/data'),
            page.getByRole('button').click()
          ]);
        }
      `,
    },
    {
      name: "Solution 2: Prior assignment to a variable (Pending Promise)",
      code: `
        async function test() {
          const responsePromise = page.waitForResponse('**/api/data');
          await page.getByRole('button').click();
          await responsePromise;
        }
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Network listener executed after the UI action",
      code: `
        async function test() {
          await page.getByRole('button').click();
          await page.waitForResponse('**/api/data');
        }
      `,
      errors: [
        { 
          messageId: "sequentialListener",
          suggestions: [
            {
              messageId: "useVariableAssign",
              output: `
        async function test() {
          const eventPromise = page.waitForResponse('**/api/data');
          await page.getByRole('button').click();
          await eventPromise;
        }
      `
            },
            {
              messageId: "usePromiseAll",
              output: `
        async function test() {
          await Promise.all([
            page.waitForResponse('**/api/data'),
            page.getByRole('button').click()
          ]);
        }
      `
            }
          ]
        }
      ]
    }
  ]
});