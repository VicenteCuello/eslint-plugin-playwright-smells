"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-redundant-navigation-wait"); 
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-redundant-navigation-wait", rule, {
  valid: [
    {
      name: "Solution: Rely on auto-wait and Web-First assertions",
      code: `
        async function test() {
          await page.click('a[href="/dashboard"]'); 
          await expect(page.locator('.widget')).toBeVisible();
        }
      `,
    },
    {
      name: "Valid use: Actions without explicit navigation",
      code: `
        async function test() {
          await page.locator('#abrir-modal').click();
          await expect(page.locator('.modal')).toBeVisible();
        }
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Redundant navigation wait with waitForURL",
      code: `
        async function test() {
          await page.click('a[href="/dashboard"]');
          await page.waitForURL('**/dashboard');
          await expect(page.locator('.widget')).toBeVisible();
        }
      `,
      errors: [
        { 
          messageId: "redundantNav",
          suggestions: [
            {
              messageId: "removeWaitForURL",
              output: `
        async function test() {
          await page.click('a[href="/dashboard"]');
          
          await expect(page.locator('.widget')).toBeVisible();
        }
      `
            }
          ]
        }
      ]
    },
    {
      name: "Code smell: Redundant navigation wait with waitForNavigation",
      code: `
        async function test() {
          await page.getByRole('button').click();
          await page.waitForNavigation();
          await expect(page.locator('.header')).toBeVisible();
        }
      `,
      errors: [
        { 
          messageId: "redundantNav",
          suggestions: [
            {
              messageId: "removeWaitForURL",
              output: `
        async function test() {
          await page.getByRole('button').click();
          
          await expect(page.locator('.header')).toBeVisible();
        }
      `
            }
          ]
        }
      ]
    }
  ]
});