"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-inappropriate-boolean-action");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-inappropriate-boolean-action", rule, {
  valid: [
    {
      name: "Solution: Use semantic check() method",
      code: `async function test() { await settingsPage.getMetricsCheckbox().check(); }`,
    },
    {
      name: "Solution: Use semantic uncheck() method",
      code: `async function test() { await page.getByRole('checkbox').uncheck(); }`,
    },
    {
      name: "Valid use: Click on a normal button that does not include boolean identifiers",
      code: `async function test() { await page.getByRole('button', { name: 'Submit' }).click(); }`,
    }
  ],

  invalid: [
    {
      name: "Code smell: Blind click on a method containing the word checkbox",
      code: `
        async function test() {
          await settingsPage.getMetricsCheckbox().click();
        }
      `,
      errors: [
        { 
          messageId: "inappropriateBoolean",
          suggestions: [
            {
              messageId: "replaceWithCheck",
              output: `
        async function test() {
          await settingsPage.getMetricsCheckbox().check();
        }
      `
            },
            {
              messageId: "replaceWithUncheck",
              output: `
        async function test() {
          await settingsPage.getMetricsCheckbox().uncheck();
        }
      `
            }
          ]
        }
      ]
    },
    {
      name: "Code smell: Blind click using an explicit role locator",
      code: `
        async function test() {
          await page.getByRole('checkbox', { name: 'Accept' }).click();
        }
      `,
      errors: [
        { 
          messageId: "inappropriateBoolean",
          suggestions: [
            { messageId: "replaceWithCheck", output: `
        async function test() {
          await page.getByRole('checkbox', { name: 'Accept' }).check();
        }
      ` },
            { messageId: "replaceWithUncheck", output: `
        async function test() {
          await page.getByRole('checkbox', { name: 'Accept' }).uncheck();
        }
      ` }
          ]
        }
      ]
    }
  ]
});