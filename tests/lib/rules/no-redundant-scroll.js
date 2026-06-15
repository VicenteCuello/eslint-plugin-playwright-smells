"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-redundant-scroll");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-redundant-scroll", rule, {
  valid: [
    {
      name: "Solution: Direct action relying on Playwright's auto-scroll",
      code: `
        async function test() {
          await footnoteRef.click();
        }
      `,
    },
    {
      name: "Valid use: Manual scroll without subsequent action (e.g., triggering lazy loading)",
      code: `
        async function test() {
          await footer.scrollIntoViewIfNeeded();
          await expect(footer).toBeVisible();
        }
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Scroll followed by click on the same element",
      code: `
        async function test() {
          await footnoteRef.scrollIntoViewIfNeeded();
          await footnoteRef.click();
        }
      `,
      errors: [
        { 
          messageId: "redundantScroll",
          suggestions: [
            {
              messageId: "removeScroll",
              output: `
        async function test() {
          
          await footnoteRef.click();
        }
      `
            }
          ]
        }
      ]
    },
    {
      name: "Code smell: Scroll followed by fill on the same element",
      code: `
        async function test() {
          const input = page.locator('#email');
          await input.scrollIntoViewIfNeeded();
          await input.fill('test@test.com');
        }
      `,
      errors: [
        { 
          messageId: "redundantScroll",
          suggestions: [
            {
              messageId: "removeScroll",
              output: `
        async function test() {
          const input = page.locator('#email');
          
          await input.fill('test@test.com');
        }
      `
            }
          ]
        }
      ]
    }
  ]
});