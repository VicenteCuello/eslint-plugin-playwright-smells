"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-missing-viewport-assertion");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-missing-viewport-assertion", rule, {
  valid: [
    {
      name: "Solution: Strict viewport assertion after scroll",
      code: `
        async function test() {
          await footnoteRef.scrollIntoViewIfNeeded();
          await expect(footnoteRef).toBeInViewport();
          await footnoteRef.click();
        }
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Click executed before confirming the scroll finished",
      code: `
        async function test() {
          await footnoteRef.scrollIntoViewIfNeeded();
          await footnoteRef.click();
        }
      `,
      errors: [
        { 
          messageId: "missingViewport",
          suggestions: [
            {
              messageId: "addViewportAssertion",
              output: `
        async function test() {
          await footnoteRef.scrollIntoViewIfNeeded();
          await expect(footnoteRef).toBeInViewport();
          await footnoteRef.click();
        }
      `
            }
          ]
        }
      ]
    },
    {
      name: "Code smell: Scroll at the end of a block without assertion",
      code: `
        async function test() {
          const button = page.locator('#submit');
          await button.scrollIntoViewIfNeeded();
        }
      `,
      errors: [
        { 
          messageId: "missingViewport",
          suggestions: [
            {
              messageId: "addViewportAssertion",
              output: `
        async function test() {
          const button = page.locator('#submit');
          await button.scrollIntoViewIfNeeded();
          await expect(button).toBeInViewport();
        }
      `
            }
          ]
        }
      ]
    }
  ]
});