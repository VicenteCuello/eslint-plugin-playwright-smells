"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-networkidle");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-networkidle", rule, {
  valid: [
    {
      name: "Valid use: Waiting for the DOM to be ready",
      code: `async function test() { await page.waitForLoadState("domcontentloaded"); }`,
    },
    {
      name: "Solution: Rely directly on web-first assertions",
      code: `
        async function test() { 
          await expect(page.getByRole("heading")).toBeVisible(); 
        }
      `,
    },
    {
      name: "Solution: Wait for a specific request",
      code: `
        async function test() { 
          await page.waitForResponse('**/api/data'); 
        }
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Relying on network inactivity to validate the UI",
      code: `
        async function test() {
          await page.waitForLoadState("networkidle");
          await expect(page.getByRole("heading")).toBeVisible();
        }
      `,
      errors: [
        { 
          messageId: "inappropriateWait",
          suggestions: [
            {
              messageId: "removeLine",
              output: `
        async function test() {
          
          await expect(page.getByRole("heading")).toBeVisible();
        }
      `
            },
            {
              messageId: "replaceWithResponse",
              output: `
        async function test() {
          await page.waitForResponse(resp => resp.url().includes('/api/desired-route') && resp.status() === 200);
          await expect(page.getByRole("heading")).toBeVisible();
        }
      `
            }
          ]
        }
      ]
    }
  ]
});