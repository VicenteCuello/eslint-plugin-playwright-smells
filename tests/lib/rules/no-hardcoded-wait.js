"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-hardcoded-wait");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-hardcoded-wait", rule, {
  valid: [
    {
      name: "Solution 1: Web-First assertion with timeout",
      code: `
        async function test() {
          await page.click("#submit");
          await expect(page.locator(".success")).toBeVisible({ timeout: 10000 });
        }
      `,
    },
    {
      name: "Solution 2: Deterministic wait for the response promise",
      code: `
        async function test() {
          const archiveResponsePromise = page.waitForResponse(
            resp => resp.url().includes('/archive') && resp.status() === 200
          );
          await page.locator('.toolbar-btn').click();
          await archiveResponsePromise;
        }
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell 1: Simple static pause",
      code: `
        async function test() {
          await page.click("#submit");
          await page.waitForTimeout(2000); 
          await expect(page.locator(".success")).toBeVisible();
        }
      `,
      errors: [
        { 
          messageId: "hardcodedWait",
          suggestions: [
            { 
              messageId: "removeWait",
              // When deleting "await page.waitForTimeout(2000)", the semicolon remains
              output: `
        async function test() {
          await page.click("#submit");
          ; 
          await expect(page.locator(".success")).toBeVisible();
        }
      `
            },
            { 
              messageId: "replaceWithLocator",
              output: `
        async function test() {
          await page.click("#submit");
          await expect(page.locator('YOUR_SELECTOR_HERE')).toBeVisible({ timeout: 10000 }); 
          await expect(page.locator(".success")).toBeVisible();
        }
      `
            }
          ]
        }
      ],
    },
    {
      name: "Code smell 2: Manual network tracking and static pause",
      code: `
        async function test() {
          let archiveCalled = false;
          await page.route('**/api/messages/*/archive', async route => { 
            archiveCalled = true; 
          });
          await page.locator('.toolbar-btn').click();
          await page.waitForTimeout(500); 
        }
      `,
      errors: [
        { 
          messageId: "hardcodedWait",
          suggestions: [
            { 
              messageId: "removeWait",
              output: `
        async function test() {
          let archiveCalled = false;
          await page.route('**/api/messages/*/archive', async route => { 
            archiveCalled = true; 
          });
          await page.locator('.toolbar-btn').click();
          ; 
        }
      `
            },
            { 
              messageId: "replaceWithLocator",
              output: `
        async function test() {
          let archiveCalled = false;
          await page.route('**/api/messages/*/archive', async route => { 
            archiveCalled = true; 
          });
          await page.locator('.toolbar-btn').click();
          await expect(page.locator('YOUR_SELECTOR_HERE')).toBeVisible({ timeout: 10000 }); 
        }
      `
            }
          ]
        }
      ],
    }
  ],
});