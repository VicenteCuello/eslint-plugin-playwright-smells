/**
 * @fileoverview Detects and forbids the redundant use of waitForURL.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Avoid using waitForURL or waitForNavigation. Rely on Web-First assertions (toBeVisible).",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#redundant-navigation-wait"
    },
    hasSuggestions: true,
    messages: {
      redundantNav: "Code smell detected: Redundant navigation wait. Playwright auto-waits during clicks and Web-First assertions. waitForURL is unnecessary here.",
      removeWaitForURL: "Suggestion: Remove the explicit URL wait."
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        if (node.callee && node.callee.type === "MemberExpression") {
          const propName = node.callee.property.name;
          const objectName = node.callee.object.type === 'Identifier' ? node.callee.object.name : null;

          // Detect if the user is using obsolete or redundant navigation waits
          if (propName === "waitForURL" || propName === "waitForNavigation") {
            if (objectName !== 'page') {
                return; 
            }
            
            // Traverse up the AST to capture the entire line and delete it cleanly
            let targetNode = node;
            if (targetNode.parent && targetNode.parent.type === "AwaitExpression") {
              targetNode = targetNode.parent;
            }
            const isExpressionStatement = targetNode.parent && targetNode.parent.type === "ExpressionStatement";
            const nodeToReplace = isExpressionStatement ? targetNode.parent : targetNode;

            context.report({
              node: node, // Specifically highlight waitForURL
              messageId: "redundantNav",
              suggest: [
                {
                  messageId: "removeWaitForURL",
                  fix: function(fixer) {
                    // Delete the entire line
                    return fixer.remove(nodeToReplace);
                  }
                }
              ]
            });
          }
        }
      }
    };
  }
};