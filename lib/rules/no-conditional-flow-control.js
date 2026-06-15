/**
 * @fileoverview Detecta y prohíbe el uso de try/catch para enmascarar aserciones y condicionales basados en isVisible.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Evitar el control de flujo con excepciones para aserciones y la trampa de condicionales con isVisible().",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#try-catch--conditional-flow-control"
    },
    hasSuggestions: false, // Solución arquitectónica: requiere rediseñar el flujo o crear un helper con waitFor
    messages: {
      tryCatchExpect: "Code smell detectado: Control de flujo por excepciones. Envolver 'expect' en un try/catch enmascara fallos de la aplicación y rompe el determinismo.",
      isVisibleTrap: "Code smell detectado: La trampa de isVisible(). Usar isVisible() en un condicional evalúa el DOM instantáneamente sin auto-espera, causando falsos negativos por latencia."
    },
    schema: [],
  },

  create(context) {
    return {
      // 1. Detección de la Trampa de isVisible() en condicionales
      IfStatement(node) {
        // Función recursiva para buscar isVisible/isHidden dentro de la condición del IF
        function hasIsVisible(expr) {
          if (!expr) return false;
          if (expr.type === "AwaitExpression") return hasIsVisible(expr.argument);
          if (expr.type === "UnaryExpression") return hasIsVisible(expr.argument);
          if (expr.type === "LogicalExpression" || expr.type === "BinaryExpression") {
            return hasIsVisible(expr.left) || hasIsVisible(expr.right);
          }
          if (expr.type === "CallExpression" && expr.callee.type === "MemberExpression") {
            const name = expr.callee.property.name;
            if (name === "isVisible" || name === "isHidden") {
              return true;
            }
          }
          return false;
        }

        if (hasIsVisible(node.test)) {
          context.report({
            node: node.test, // Subrayamos la condición completa del if
            messageId: "isVisibleTrap"
          });
        }
      },

      // 2. Detección de enmascaramiento de aserciones en try/catch
      TryStatement(node) {
        const tryBody = node.block.body;
        
        // Revisamos las instrucciones directamente dentro del bloque try
        for (const stmt of tryBody) {
          if (stmt.type === "ExpressionStatement") {
            let expr = stmt.expression;
            if (expr.type === "AwaitExpression") expr = expr.argument;
            
            // Verificamos si la expresión es una llamada a expect()
            if (expr && expr.type === "CallExpression" && expr.callee.type === "MemberExpression") {
              if (expr.callee.object && 
                  expr.callee.object.type === "CallExpression" && 
                  expr.callee.object.callee.name === "expect") {
                
                context.report({
                  node: stmt, // Subrayamos específicamente la línea del expect dentro del try
                  messageId: "tryCatchExpect"
                });
              }
            }
          }
        }
      }
    };
  }
};