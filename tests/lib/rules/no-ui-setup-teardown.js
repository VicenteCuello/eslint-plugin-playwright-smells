"use strict";

const { RuleTester } = require("eslint");
const rule = require("../../../lib/rules/no-ui-setup-teardown");
const tsParser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("no-ui-setup-teardown", rule, {
  valid: [
    {
      name: "Solución: Uso de llamadas HTTP en el teardown",
      code: `
        test.afterAll(async ({ request }) => {
          await request.delete('/api/v1/users/clean');
        });
      `,
    },
    {
      name: "Uso válido: Acciones UI dentro de una prueba normal (fuera de hooks)",
      code: `
        test('validar formulario', async ({ page }) => {
          await page.getByRole('button').click();
          await page.getByPlaceholder('Email').fill('test@test.com');
        });
      `,
    }
  ],

  invalid: [
    {
      name: "Code smell: Clic gráfico dentro de afterAll",
      code: `
        test.afterAll(async ({ page }) => {
          await page.getByTestId('settings').click();
          await page.getByTestId('delete-user').click();
        });
      `,
      errors: [
        { messageId: "uiInHook", data: { action: "click", hook: "afterAll" } },
        { messageId: "uiInHook", data: { action: "click", hook: "afterAll" } }
      ]
    },
    {
      name: "Code smell: Rellenar formulario de Login dentro de beforeEach",
      code: `
        test.beforeEach(async ({ page }) => {
          await page.goto('/login');
          await page.locator('#username').fill('admin');
          await page.locator('#password').fill('1234');
          await page.locator('#submit').click();
        });
      `,
      errors: [
        { messageId: "uiInHook", data: { action: "fill", hook: "beforeEach" } },
        { messageId: "uiInHook", data: { action: "fill", hook: "beforeEach" } },
        { messageId: "uiInHook", data: { action: "click", hook: "beforeEach" } }
      ]
    }
  ]
});