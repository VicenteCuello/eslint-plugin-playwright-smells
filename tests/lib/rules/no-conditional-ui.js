"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-conditional-ui");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-conditional-ui", rule, {
  valid: [
    {
      name: "Solution: Linear deterministic flow and direct assertions",
      code: `
        async function test() { 
          const graphLink = page.locator('aside a').first();
          await expect(graphLink).toBeVisible();
          await graphLink.click(); 
        }
      `,
    },
    {
      name: "Valid use: If statement with standard business variables (not UI)",
      code: `
        async function test() { 
          const isDesktop = true;
          if (isDesktop) {
             await page.locator('.sidebar').click();
          }
        }
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Direct conditional with visual state",
      code: `
        async function test() {
          const graphLink = page.locator('aside a').first();
          if (await graphLink.isVisible()) {
            await graphLink.click();
          }
        }
      `,
      errors: [{ messageId: "conditionalUI" }]
    },
    {
      name: "Code smell: Conditional with catch trapping errors (the original example)",
      code: `
        async function test() {
          const graphLink = page.locator('aside a').first();
          if (await graphLink.isVisible().catch(() => false)) {
            await graphLink.click();
          }
        }
      `,
      errors: [{ messageId: "conditionalUI" }]
    },
    {
      name: "Code smell: Ternary operator based on the UI",
      code: `
        async function test() {
          const text = await page.getByRole('button').isEnabled() ? 'Active' : 'Inactive';
        }
      `,
      errors: [{ messageId: "conditionalUI" }]
    }
  ]
});