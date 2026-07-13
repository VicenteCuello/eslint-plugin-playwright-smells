"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-premature-counting");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-premature-counting", rule, {
  valid: [
    {
      name: "Solution: Native toHaveCount usage with auto-wait",
      code: `
        async function test() {
          await expect(page.getByText("Message sent")).toHaveCount(1);
        }
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Extraction to variable and subsequent assertion",
      code: `
        async function test() {
          await page.getByRole("button", { name: "Send" }).click(); 
          const messages = await page.getByText("Message sent").count();
          expect(messages).toBe(1);
        }
      `,
      output: `
        async function test() {
          await page.getByRole("button", { name: "Send" }).click(); 
          const messages = await page.getByText("Message sent").count();
          await expect(page.getByText("Message sent")).toHaveCount(1);
        }
      `,
      errors: [{ messageId: "prematureCounting" }]
    },
    {
      name: "Code smell: Synchronous count injected directly into the expect",
      code: `
        async function test() {
          expect(await page.locator('.items').count()).toEqual(3);
        }
      `,
      output: `
        async function test() {
          await expect(page.locator('.items')).toHaveCount(3);
        }
      `,
      errors: [{ messageId: "prematureCounting" }]
    }
  ]
});