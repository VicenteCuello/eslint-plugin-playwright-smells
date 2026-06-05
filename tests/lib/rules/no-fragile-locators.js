"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-fragile-locators");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-fragile-locators", rule, {
  valid: [
    {
      name: "Solution: Using test-ids for resilient anchoring",
      code: `async function test() { await page.getByTestId('submit-button').click(); }`,
    },
    {
      name: "Solution: Semantic and role filters",
      code: `async function test() { await page.locator('tr').filter({ hasText: 'Item 1' }).getByRole('button', { name: /delete/i }).click(); }`,
    },
    {
      name: "Solution: Strict text search",
      code: `async function test() { await page.getByText('Submit', { exact: true }).click(); }`,
    }
  ],

  invalid: [
    {
      name: "Code smell: Deep hierarchical CSS selector",
      code: `async function test() { await page.locator('div > div:nth-child(3) > button').click(); }`,
      errors: [{ 
        messageId: "complexSelector",
        suggestions: [{ messageId: "replaceWithTestId", output: `async function test() { await page.getByTestId('YOUR_ID_HERE').click(); }` },
          { messageId: "replaceWithSemanticFilter", output: `async function test() { await page.locator('YOUR_CONTAINER_HERE').filter({ hasText: 'YOUR_TEXT_HERE' }).getByRole('button', { name: 'YOUR_NAME_HERE' }).click(); }` }
        ]
      }]
    },
    {
      name: "Code smell: Lazy resolution with positional indexes",
      code: `async function test() { await page.locator('button').nth(2).click(); }`,
      errors: [{ 
        messageId: "positionalIndex",
        suggestions: [{ messageId: "replaceWithTestId", output: `async function test() { await page.getByTestId('YOUR_ID_HERE').click(); }` },
          { messageId: "replaceWithSemanticFilter", output: `async function test() { await page.locator('YOUR_CONTAINER_HERE').filter({ hasText: 'YOUR_TEXT_HERE' }).getByRole('button', { name: 'YOUR_NAME_HERE' }).click(); }` }
        ]
      }]
    },
    {
      name: "Code smell: Ambiguous global text without strict limitation",
      code: `async function test() { await page.getByText('Submit').click(); }`,
      errors: [{ 
        messageId: "inexactText",
        suggestions: [{ messageId: "addExactTrue", output: `async function test() { await page.getByText('Submit', { exact: true }).click(); }` }]
      }]
    },
    {
      name: "Code smell: Global scan of the entire document body (Assertion Roulette)",
      code: `async function test() { await page.waitForFunction(() => document.body.textContent.includes('Saved')); }`,
      errors: [{ 
        messageId: "globalScan",
        suggestions: [{ messageId: "replaceWithQuery", output: `async function test() { await page.waitForFunction(() => document.querySelector('YOUR_SPECIFIC_SELECTOR').textContent.includes('Saved')); }` }]
      }]
    }
  ]
});