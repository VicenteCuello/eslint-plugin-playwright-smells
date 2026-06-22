/**
 * @fileoverview Detects and forbids the use of hardcoded local timeouts and test.setTimeout.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Forbid local timeout overrides to force centralization in playwright.config.ts and promote test.slow().",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#inline-timeout-overrides"
    },
    hasSuggestions: true, 
    messages: {
      inlineTimeout: "Code smell...",
      testSetTimeout: "Code smell...",
      replaceWithSlow: "Suggestion: Replace with test.slow()",
      removeTimeout: "Suggestion: Remove the local timeout"
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        
        // 1. Test Timeout Inflation detection: test.setTimeout(X)
        if (node.callee.type === "MemberExpression" &&
            node.callee.object.name === "test" &&
            node.callee.property.name === "setTimeout") {
          
          context.report({
            node: node.callee.property,
            messageId: "testSetTimeout",
            suggest: [
              {
                messageId: "replaceWithSlow",
                fix: fixer => fixer.replaceText(node, "test.slow()")
              }
            ]
          });
          return; 
        }

        let methodName = "";
        if (node.callee.type === "MemberExpression") {
          methodName = node.callee.property.name;
        }

        const playwrightMethods = [
          "toBeVisible", "toBeHidden", "toHaveText", "toHaveURL", "toHaveCount", "toHaveClass", "toHaveValue",
          "click", "fill", "type", "press", "goto", "waitForURL", "waitForSelector", "waitForResponse", "waitForNavigation", "waitForLoadState"
        ];

        if (!playwrightMethods.includes(methodName)) {
          return;
        }

        // 2. Inline Timeout Overrides detection: { timeout: 15000 }
        const args = node.arguments;
        if (args.length > 0) {
          const lastArg = args[args.length - 1];
          
          if (lastArg.type === "ObjectExpression") {
            const timeoutProp = lastArg.properties.find(p => p.key && p.key.name === "timeout");
            
            if (timeoutProp) {
              context.report({
                node: timeoutProp.key,
                messageId: "inlineTimeout",
                suggest: [
                  {
                    messageId: "removeTimeout",
                    fix: fixer => fixer.remove(timeoutProp)
                  }
                ]
              });
            }
          }
        }
      }
    };
  }
};