"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-conditional-flow-control");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-conditional-flow-control", rule, {
  valid: [
    {
      name: "Solución 1: Flujo determinista natural sin try/catch",
      code: `
        async function test() {
          await editSheet.getByRole('button').click(); 
          await expect(editSheet).toBeHidden();
        }
      `,
    },
    {
      name: "Solución 2: Helper con waitFor dentro de un try/catch (Válido porque NO enmascara un expect)",
      code: `
        async function test() {
          try {
            await target.waitFor({ state: 'visible', timeout: 2500 });
            return true;
          } catch {
            return false;
          }
        }
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Aserción expect escondida en un try/catch",
      code: `
        async function test() {
          try { 
            await expect(editSheet).toBeHidden({ timeout: 15000 });
          } catch {
            await page.keyboard.press('Escape');
          }
        }
      `,
      errors: [{ messageId: "tryCatchExpect" }]
    },
    {
      name: "Code smell: Trampa isVisible en if condicional (Directo)",
      code: `
        async function test() {
          if (await target.isVisible()) {
            return target;
          }
        }
      `,
      errors: [{ messageId: "isVisibleTrap" }]
    },
    {
      name: "Code smell: Trampa isHidden en condicional con negación",
      code: `
        async function test() {
          if (!await modal.isHidden()) {
            await modal.click();
          }
        }
      `,
      errors: [{ messageId: "isVisibleTrap" }]
    }
  ]
});