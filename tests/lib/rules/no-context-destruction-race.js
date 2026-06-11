"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-context-destruction-race");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-context-destruction-race", rule, {
  valid: [
    {
      name: "Solution: Wrap the evaluation in a toPass() block",
      code: `
        async function test() {
          await gotoPage(page, URL);
          await expect(async () => {
             const color = await page.evaluate(() => document.documentElement.style.color);
             expect(color).toBe("");
          }).toPass({ timeout: 10_000 });
        }
      `,
    },
    {
      name: "Valid use: evaluate without recent prior navigation",
      code: `
        async function test() {
          const title = await page.title();
          const color = await page.evaluate(() => document.documentElement.style.color);
        }
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Executing evaluate right when the page purges the DOM",
      code: `
        async function test() {
          await gotoPage(page, URL);
          const color = await page.evaluate(() => document.documentElement.style.color);
        }
      `,
      errors: [
        { 
          messageId: "contextRace",
          suggestions: [
            {
              messageId: "wrapWithToPass",
              output: `
        async function test() {
          await gotoPage(page, URL);
          await expect(async () => {
  const color = await page.evaluate(() => document.documentElement.style.color);
  expect(color).toBe(""); // Replace with your actual assertion
}).toPass({ timeout: 10_000 });
        }
      `
            }
          ]
        }
      ]
    },
    {
      name: "Code smell: Using the native page.goto method",
      code: `
        async function test() {
          await page.goto('/home');
          await page.evaluate(() => window.localStorage.setItem('auth', '123'));
        }
      `,
      errors: [
        { 
          messageId: "contextRace",
          suggestions: [
            {
              messageId: "wrapWithToPass",
              output: `
        async function test() {
          await page.goto('/home');
          await expect(async () => {
  await page.evaluate(() => window.localStorage.setItem('auth', '123'));
  expect(color).toBe(""); // Replace with your actual assertion
}).toPass({ timeout: 10_000 });
        }
      `
            }
          ]
        }
      ]
    }
  ]
});