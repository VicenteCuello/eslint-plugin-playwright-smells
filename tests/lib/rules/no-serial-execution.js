"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-serial-execution");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-serial-execution", rule, {
  valid: [
    {
      name: "Valid use: Normal test.describe block (parallel/independent execution)",
      code: `
        test.describe('Users Module', () => {
          test('create user', async ({ page }) => { });
          test('delete user', async ({ page }) => { });
        });
      `,
    },
    {
      name: "Solution: Use test.step within a single test",
      code: `
        test('Complete checkout flow', async ({ page }) => {
          await test.step('Step 1: Add', async () => { });
          await test.step('Step 2: Pay', async () => { });
        });
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Tying tests together with test.describe.serial",
      code: `
        test.describe.serial('checkout flow', () => {
          test('step 1', async ({ page }) => { });
          test('step 2', async ({ page }) => { });
        });
      `,
      errors: [{ messageId: "serialAbuse" }]
    }
  ]
});