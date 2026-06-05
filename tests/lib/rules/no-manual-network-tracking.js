"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-manual-network-tracking");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-manual-network-tracking", rule, {
  valid: [
    {
      name: "Solution: Deterministic promise wait",
      code: `
        async function test() {
          const archiveResponsePromise = page.waitForResponse(resp => resp.status() === 200);
          await page.locator('.toolbar-btn').click();
          await archiveResponsePromise;
        }
      `,
    },
    {
      name: "Valid use of page.route to mock data (no manual tracking)",
      code: `
        async function test() {
          await page.route('**/api/*', async route => {
            // This is valid: it does not mutate external variables, only fulfills the request
            await route.fulfill({ status: 200, body: 'ok' }); 
          });
        }
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Variable mutation inside page.route",
      code: `
        async function test() {
          let archiveCalled = false;
          await page.route('**/api/messages/*/archive', async route => { 
            archiveCalled = true; 
          });
          await page.locator('.toolbar-btn').click();
        }
      `,
      errors: [
        { 
          messageId: "manualTracking",
          suggestions: [
            {
              messageId: "replaceWithResponse",
              output: `
        async function test() {
          let archiveCalled = false;
          await page.waitForResponse(resp => resp.url().includes('/ruta/api') && resp.status() === 200);
          await page.locator('.toolbar-btn').click();
        }
      `
            }
          ]
        }
      ],
    }
  ],
});