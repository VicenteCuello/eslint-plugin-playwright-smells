/**
 * @fileoverview Detects and forbids the use of waitForLoadState("networkidle").
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Avoid using networkidle, as it causes flakiness in modern applications with background network activity.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#inappropriate-wait-strategy-networkidle-usage"
    },
    hasSuggestions: true,
    messages: {
      inappropriateWait: "Code smell detected: networkidle usage. In modern applications (with polling or telemetry) the network is rarely inactive, causing severe timeouts.",
      removeLine: "Suggestion: Remove the wait and rely on Web-First assertions (e.g., toBeVisible)",
      replaceWithResponse: "Suggestion: Wait explicitly for a specific network request (waitForResponse)"
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        if (node.callee && node.callee.type === "MemberExpression") {
          const propName = node.callee.property.name;

          if (propName === "waitForLoadState" && node.arguments.length > 0) {
            const firstArg = node.arguments[0];

            // Verify if the argument is exactly the string 'networkidle'
            if (firstArg.type === "Literal" && firstArg.value === "networkidle") {
              
              // 1. Start at the function node
              let targetNode = node;
              
              // 2. Traverse up to the "await" if it exists
              if (targetNode.parent && targetNode.parent.type === "AwaitExpression") {
                targetNode = targetNode.parent;
              }
              
              // 3. Traverse up to the "ExpressionStatement" to capture the semicolon (;)
              const isExpressionStatement = targetNode.parent && targetNode.parent.type === "ExpressionStatement";
              const nodeToReplace = isExpressionStatement ? targetNode.parent : targetNode;

              context.report({
                node: node, 
                messageId: "inappropriateWait",
                suggest: [
                  {
                    messageId: "removeLine",
                    fix: function(fixer) {
                      // Now delete the entire line (including the semicolon)
                      return fixer.remove(nodeToReplace);
                    }
                  },
                  {
                    messageId: "replaceWithResponse",
                    fix: function(fixer) {
                      // Since we deleted the original semicolon, we cleanly add it to the new string
                      const semicolon = isExpressionStatement ? ";" : "";
                      return fixer.replaceText(nodeToReplace, "await page.waitForResponse(resp => resp.url().includes('/api/desired-route') && resp.status() === 200)" + semicolon);
                    }
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