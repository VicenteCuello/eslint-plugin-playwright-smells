"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/prefer-web-first-assertions");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("prefer-web-first-assertions", rule, {
  valid: [
    {
      name: "Solution: Web-first assertion (toBeVisible)",
      code: `async function test() { await expect(page.getByTestId('table')).toBeVisible(); }`,
    },
    {
      name: "Solution: Web-first assertion (toHaveURL)",
      code: `async function test() { await expect(page).toHaveURL('https://app.com/dashboard'); }`,
    },
    {
      name: "Solution: Web-first assertion (toHaveAttribute)",
      code: `async function test() { await expect(mute).toHaveAttribute('aria-pressed', 'true'); }`,
    },
    {
      name: "Valid use of isVisible in control logic (NOT A SMELL)",
      code: `
        async function test() {
          if (await page.getByTestId('modal').isVisible()) {
            await page.click('button.close');
          }
        }
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell 1: Evaluating static boolean state",
      code: `
        async function test() {
          expect(await page.getByTestId('table').isVisible()).toBe(true);
        }
      `,
      output: `
        async function test() {
          await expect(page.getByTestId('table')).toBeVisible();
        }
      `,
      errors: [{ messageId: "eagerAssertion" }]
    },
    {
      name: "Code smell 2: Strict URL assertion",
      code: `
        async function test() {
          expect(page.url()).toEqual('https://app.com/dashboard');
        }
      `,
      output: `
        async function test() {
          await expect(page).toHaveURL('https://app.com/dashboard');
        }
      `,
      errors: [{ messageId: "eagerAssertion" }]
    },
    {
      name: "Code smell 3: Manual synchronous attribute extraction",
      code: `
        async function test() {
          const afterPressed = await mute.getAttribute('aria-pressed');
          expect(afterPressed).toBe('true');
        }
      `,
      output: `
        async function test() {
          const afterPressed = await mute.getAttribute('aria-pressed');
          await expect(mute).toHaveAttribute('aria-pressed', 'true');
        }
      `,
      errors: [{ messageId: "eagerAssertion" }]
    }
  ]
});