/**
 * @fileoverview Disallow the use of hardcoded waits like page.waitForTimeout()
 */
"use strict";

module.exports = {
  meta: {
    type: "problem", 
    docs: {
      description: "Halting execution with explicit pauses blocks the event loop and causes flakiness.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#hardcoded-wait-sleepy-test"
    },
    // 1. Explicitly enable the suggestions API
    hasSuggestions: true, 
    messages: {
      hardcodedWait: "Code smell detected: Avoid using page.waitForTimeout().",
      // 2. Define the texts that will appear in the IDE's interactive menu
      removeWait: "Suggestion: Remove the static wait completely",
      replaceWithLocator: "Suggestion: Replace with a Web-First assertion (requires adjusting the selector)"
    },
    schema: [], 
  },

  create(context) {
    return {
      CallExpression(node) {
        if (node.callee && node.callee.type === "MemberExpression") {
          const propertyName = node.callee.property.name;
          
          if (propertyName === "waitForTimeout") {
            context.report({
              node: node,
              messageId: "hardcodedWait",
              // 3. Inject the refactoring options
              suggest: [
                {
                  messageId: "removeWait",
                  fix: function(fixer) {
                    // If the parent node is the "await", we delete it completely to avoid leaving broken syntax
                    const nodeToRemove = (node.parent && node.parent.type === "AwaitExpression") ? node.parent : node;
                    return fixer.remove(nodeToRemove);
                  }
                },
                {
                  messageId: "replaceWithLocator",
                  fix: function(fixer) {
                    // Replace the function keeping the original "await" intact
                    return fixer.replaceText(node, "expect(page.locator('YOUR_SELECTOR_HERE')).toBeVisible({ timeout: 10000 })");
                  }
                }
              ]
            });
          }
        }
      },
    };
  },
};