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
    fixable: "code",
    messages: {
      inlineTimeout: "Code smell detected: Inline Timeout Override. Avoid hardcoding wait times. Centralize configuration in playwright.config.ts to allow scalability in CI/CD.",
      testSetTimeout: "Code smell detected: Test Timeout Inflation. Forcing a static timeout masks performance issues. Use 'test.slow()' to semantically indicate that the test requires more time."
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
            node: node.callee.property, // Highlight "setTimeout"
            messageId: "testSetTimeout",
            fix: fixer => fixer.replaceText(node, "test.slow()")
          });
          return; // Exit early for this evaluation
        }

        // 2. Inline Timeout Overrides detection: { timeout: 15000 }
        const args = node.arguments;
        if (args.length > 0) {
          const lastArg = args[args.length - 1];
          
          // Check if the last argument is a configuration object
          if (lastArg.type === "ObjectExpression") {
            const timeoutProp = lastArg.properties.find(p => p.key && p.key.name === "timeout");
            
            if (timeoutProp) {
              context.report({
                node: timeoutProp.key, // Highlight only the word 'timeout'
                messageId: "inlineTimeout",
                fix: fixer => {
                  // Delete the entire property (e.g., "timeout: 15000")
                  return fixer.remove(timeoutProp);
                }
              });
            }
          }
        }
      }
    };
  }
};