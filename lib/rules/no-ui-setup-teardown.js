/**
 * @fileoverview Detecta y prohíbe el uso de interacciones UI dentro de los hooks de configuración y limpieza.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Evitar interacciones de UI (click, fill, etc.) en los hooks before/after. Usar APIRequestContext en su lugar.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#ui-based-setupteardown"
    },
    hasSuggestions: false, // Requiere reescribir la lógica usando llamadas HTTP (request.post/delete)
    messages: {
      uiInHook: "Code smell detectado: Configuración basada en UI. Has usado '{{action}}' dentro de un hook '{{hook}}'. Reemplaza la manipulación gráfica con llamadas API directas (request) o inyección de estado para mejorar la velocidad y estabilidad."
    },
    schema: [],
  },

  create(context) {
    const HOOKS = ["beforeAll", "beforeEach", "afterAll", "afterEach"];
    const UI_ACTIONS = ["click", "fill", "check", "uncheck", "type", "press", "dblclick", "hover", "selectOption", "tap", "dragTo"];
    
    let hookDepth = 0;
    let currentHook = "";

    return {
      CallExpression(node) {
        if (node.callee && node.callee.type === "MemberExpression") {
          const obj = node.callee.object;
          const prop = node.callee.property;

          // Detectamos si estamos entrando a un hook (test.beforeAll, test.afterEach, etc.)
          if (obj && obj.name === "test" && prop && HOOKS.includes(prop.name)) {
            hookDepth++;
            currentHook = prop.name;
          }

          // Si estamos dentro de un hook y detectamos un verbo de interacción UI, reportamos
          if (hookDepth > 0 && prop && UI_ACTIONS.includes(prop.name)) {
            context.report({
              node: prop, // Subrayamos el verbo exacto (ej. click)
              messageId: "uiInHook",
              data: { 
                action: prop.name,
                hook: currentHook
              }
            });
          }
        }
      },
      "CallExpression:exit"(node) {
        // Reducimos la profundidad al salir del hook
        if (node.callee && node.callee.type === "MemberExpression") {
          const obj = node.callee.object;
          const prop = node.callee.property;
          if (obj && obj.name === "test" && prop && HOOKS.includes(prop.name)) {
            hookDepth--;
          }
        }
      }
    };
  }
};