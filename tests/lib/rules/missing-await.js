"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/missing-await");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("missing-await", rule, {
  valid: [
    {
      name: "Solution: Asynchronous assertion correctly awaited",
      code: `
        async function test() {
          await expect(page.getByText("Error")).toBeHidden();
        }
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Asynchronous assertion without await (Orphan Promise)",
      code: `
        async function test() {
          expect(page.getByText("Error")).not.toBeVisible();
        }
      `,
      // RuleTester will validate that the 'fixer' injects the await correctly here
      output: `
        async function test() {
          await expect(page.getByText("Error")).not.toBeVisible();
        }
      `,
      errors: [{ messageId: "missingAwait" }],
    }
  ],
});