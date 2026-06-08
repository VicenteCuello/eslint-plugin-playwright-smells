/**
 * @fileoverview Detects manual retry loops that use explicit pauses.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Avoid manual retry loops (while/for) with static waits. Use expect.poll or toPass.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#custom-retry-loops"
    },
    hasSuggestions: true,
    messages: {
      customRetryLoop: "Code smell detected: Custom retry loop. This is prone to infinite loops and clutters the code. Use Playwright's native mechanisms.",
      replaceWithPoll: "Suggestion: Replace with expect.poll() (Ideal for validating asynchronous returns)",
      replaceWithToPass: "Suggestion: Replace with expect().toPass() (Ideal for retrying entire blocks)"
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        if (node.callee && node.callee.type === "MemberExpression") {
          // Look for the waitForTimeout call
          if (node.callee.property.name === "waitForTimeout") {
            
            let current = node.parent;
            let isInsideLoop = false;
            let loopNode = null;

            // Traverse up the ancestors until finding a loop or exiting the function
            while (current && current.type !== "FunctionDeclaration" && current.type !== "ArrowFunctionExpression") {
              if (["WhileStatement", "ForStatement", "DoWhileStatement"].includes(current.type)) {
                isInsideLoop = true;
                loopNode = current; // Save the entire loop node
                break;
              }
              current = current.parent;
            }

            // If waitForTimeout was inside a loop, penalize the entire loop
            if (isInsideLoop) {
              context.report({
                node: loopNode, 
                messageId: "customRetryLoop",
                suggest: [
                  {
                    messageId: "replaceWithPoll",
                    fix: fixer => fixer.replaceText(loopNode, "await expect.poll(async () => {\n  // Your extraction logic here\n  return state;\n}).toBe(EXPECTED_VALUE);")
                  },
                  {
                    messageId: "replaceWithToPass",
                    fix: fixer => fixer.replaceText(loopNode, "await expect(async () => {\n  // Your assertions here\n}).toPass();")
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