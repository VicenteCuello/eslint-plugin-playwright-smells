/**
 * @fileoverview Detects asynchronous Playwright assertions that are not being awaited.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Omitting the 'await' keyword before asynchronous assertions generates false positives and instability.",
      category: "Possible Errors",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#missing-await-orphan-promise"
    },
    fixable: "code", 
    messages: {
      missingAwait: "Code smell detected: Orphan Promise. Missing the 'await' keyword before the assertion.",
    },
    schema: [],
  },

  create(context) {
    // Define the Playwright matchers that always return a promise
    const asyncMatchers = [
      "toBeVisible", "toBeHidden", "toHaveText", "toContainText",
      "toHaveCount", "toBeChecked", "toBeDisabled", "toBeEnabled"
    ];

    return {
      CallExpression(node) {
        if (node.callee && node.callee.type === "MemberExpression") {
          const propertyName = node.callee.property.name;

          // If the called function is one of the async matchers...
          if (asyncMatchers.includes(propertyName)) {
            
            // ...and the parent node is NOT an 'await' or a 'return'
            if (
              node.parent.type !== "AwaitExpression" &&
              node.parent.type !== "ReturnStatement"
            ) {
              context.report({
                node: node,
                messageId: "missingAwait",
                // Apply auto-correction by injecting the text directly
                fix: function(fixer) {
                  return fixer.insertTextBefore(node, "await ");
                }
              });
            }
          }
        }
      },
    };
  },
};