"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-self-masked-screenshot");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-self-masked-screenshot", rule, {
  valid: [
    {
      name: "Valid use: Masking a dynamic child element while evaluating the parent",
      code: `
        async function test() {
          const parentContainer = page.locator('.user-card');
          const dynamicClock = parentContainer.locator('.clock');
          
          await expect(parentContainer).toHaveScreenshot('profile.png', {
            mask: [dynamicClock]
          });
        }
      `,
    },
    {
      name: "Valid use: Standard toHaveScreenshot without mask",
      code: `
        async function test() {
          const modLocator = page.locator('.module');
          await expect(modLocator).toHaveScreenshot('name.png');
        }
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Hiding exactly the same thing that is being evaluated",
      code: `
        async function test() {
          const modLocator = page.locator('.module');
          await expect(modLocator).toHaveScreenshot('name.png', {
            mask: [modLocator]
          });
        }
      `,
      errors: [{ messageId: "selfMasked" }]
    },
    {
      name: "Code smell: Self-masked without file name",
      code: `
        async function test() {
          await expect(page.locator('.hero')).toHaveScreenshot({
            mask: [page.locator('.hero')]
          });
        }
      `,
      errors: [{ messageId: "selfMasked" }]
    }
  ]
});