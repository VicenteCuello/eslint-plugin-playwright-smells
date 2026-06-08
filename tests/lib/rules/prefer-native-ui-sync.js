"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/prefer-native-ui-sync");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("prefer-native-ui-sync", rule, {
  valid: [
    {
      name: "Solution: Asynchronous movement with auto-wait for animations",
      code: `async function test() { await page.locator('#item').hover(); }`,
    },
    {
      name: "Solution: Drag and drop with native synchronization",
      code: `async function test() { await page.locator('#draggable').dragTo(page.locator('#droptarget')); }`,
    }
  ],

  invalid: [
    {
      name: "Code smell: Race condition with manual mouse",
      code: `
        async function test() {
          await page.mouse.move(100, 200);
        }
      `,
      errors: [
        { 
          messageId: "manualMouseSync",
          suggestions: [
            { messageId: "replaceWithDragTo", output: `
        async function test() {
          await page.locator('YOUR_SOURCE').dragTo(page.locator('YOUR_DESTINATION'));
        }
      ` },
            { messageId: "replaceWithHover", output: `
        async function test() {
          await page.locator('YOUR_ELEMENT').hover();
        }
      ` }
          ]
        }
      ]
    },
    {
      name: "Code smell: Forcing clicks ignoring visual transitions",
      code: `
        async function test() {
          await page.mouse.down();
        }
      `,
      errors: [
        { 
          messageId: "manualMouseSync",
          suggestions: [
            { messageId: "replaceWithDragTo", output: `
        async function test() {
          await page.locator('YOUR_SOURCE').dragTo(page.locator('YOUR_DESTINATION'));
        }
      ` },
            { messageId: "replaceWithHover", output: `
        async function test() {
          await page.locator('YOUR_ELEMENT').hover();
        }
      ` }
          ]
        }
      ]
    }
  ]
});