"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-long-lived-evaluate");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-long-lived-evaluate", rule, {
  valid: [
    {
      name: "Valid use: Synchronous evaluate to quickly extract DOM data",
      code: `
        async function test() {
          const color = await page.evaluate(() => document.documentElement.style.color);
        }
      `,
    },
    {
      name: "Solution: Use waitForFunction for safe polling",
      code: `
        async function test() {
          await page.waitForFunction(() => { 
            const reg = navigator.serviceWorker.getRegistration(); 
            return reg?.active?.state === 'activated';
          });
        }
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Chained promise (.then) trapped in the page context",
      code: `
        async function test() {
          await page.evaluate(() => navigator.serviceWorker.ready.then(reg => reg.active));
        }
      `,
      errors: [{ messageId: "longLivedEvaluate" }]
    },
    {
      name: "Code smell: Asynchronous callback with explicit await",
      code: `
        async function test() {
          await page.evaluate(async () => {
            await new Promise(resolve => setTimeout(resolve, 5000));
          });
        }
      `,
      errors: [{ messageId: "longLivedEvaluate" }]
    },
    {
      name: "Code smell: Instantiation of a new Promise",
      code: `
        async function test() {
          await page.evaluate(() => new Promise((resolve) => {
            window.addEventListener('load', resolve);
          }));
        }
      `,
      errors: [{ messageId: "longLivedEvaluate" }]
    }
  ]
});