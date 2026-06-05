/**
 * @fileoverview Detects manual network tracking by mutating variables inside page.route().
 */
"use strict";

module.exports = {
  meta: {
    type: "suggestion", 
    docs: {
      description: "Detects manual network tracking using page.route and state variables.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#hardcoded-wait-sleepy-test"
    },
    // 1. Enable suggestions
    hasSuggestions: true, 
    messages: {
      manualTracking: "Code smell detected: Avoid tracking requests by mutating variables inside page.route().",
      // 2. Define the interactive menu message
      replaceWithResponse: "Suggestion: Replace with deterministic network wait (page.waitForResponse)"
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        if (node.callee && node.callee.type === "MemberExpression") {
          const propertyName = node.callee.property.name;

          if (propertyName === "route") {
            const callback = node.arguments[1];

            if (callback && (callback.type === "ArrowFunctionExpression" || callback.type === "FunctionExpression")) {
              const body = callback.body;
              let hasAssignment = false;

              if (body.type === "AssignmentExpression") {
                hasAssignment = true;
              } else if (body.type === "BlockStatement") {
                for (const statement of body.body) {
                  if (statement.type === "ExpressionStatement" && statement.expression.type === "AssignmentExpression") {
                    hasAssignment = true;
                    break;
                  }
                }
              }

              if (hasAssignment) {
                context.report({
                  node: node,
                  messageId: "manualTracking",
                  // 3. Inject the refactoring option
                  suggest: [
                    {
                      messageId: "replaceWithResponse",
                      fix: function(fixer) {
                        return fixer.replaceText(node, "page.waitForResponse(resp => resp.url().includes('/ruta/api') && resp.status() === 200)");
                      }
                    }
                  ]
                });
              }
            }
          }
        }
      },
    };
  },
};