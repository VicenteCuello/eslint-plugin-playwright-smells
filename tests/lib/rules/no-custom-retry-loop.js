"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-custom-retry-loop");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-custom-retry-loop", rule, {
  valid: [
    {
      name: "Solution: Correct use of expect.poll",
      code: `
        async function test() {
          await expect.poll(async () => { 
            const state = await page.getByTestId('total').textContent(); 
            return parseInt(state, 10); 
          }).toBe(100);
        }
      `,
    },
    {
      name: "Solution: Correct use of toPass",
      code: `
        async function test() {
          await expect(async () => {
            await expect(page.getByText('Cargando')).toBeHidden();
          }).toPass();
        }
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: While loop with waitForTimeout",
      code: `
        async function test() {
          let retries = 5; 
          while (retries > 0) { 
            const state = await page.getByTestId('total').textContent();
            if (parseInt(state, 10) === 100) break; 
            retries--;
            await page.waitForTimeout(1000);
          }
        }
      `,
      errors: [
        { 
          messageId: "customRetryLoop",
          suggestions: [
            {
              messageId: "replaceWithPoll",
              output: `
        async function test() {
          let retries = 5; 
          await expect.poll(async () => {
  // Your extraction logic here
  return state;
}).toBe(EXPECTED_VALUE);
        }
      `
            },
            {
              messageId: "replaceWithToPass",
              output: `
        async function test() {
          let retries = 5; 
          await expect(async () => {
  // Your assertions here
}).toPass();
        }
      `
            }
          ]
        }
      ]
    }
  ]
});