"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-element-handle");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-element-handle", rule, {
  valid: [
    {
      name: "Solution: Employ dynamic Locators",
      code: `
        async function test() {
          const saveButton = page.locator('#save'); 
          await saveButton.click();
        }
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Storing an obsolete static pointer",
      code: `
        async function test() {
          const saveButton = await page.$('#save');
          await saveButton.click();
        }
      `,
      output: `
        async function test() {
          const saveButton = page.locator('#save');
          await saveButton.click();
        }
      `,
      errors: [{ messageId: "legacyHandle" }]
    },
    {
      name: "Code smell: Use of multiple elements with $$",
      code: `
        async function test() {
          const rows = await page.$$('.fila');
        }
      `,
      output: `
        async function test() {
          const rows = page.locator('.fila');
        }
      `,
      errors: [{ messageId: "legacyHandle" }]
    }
  ]
});