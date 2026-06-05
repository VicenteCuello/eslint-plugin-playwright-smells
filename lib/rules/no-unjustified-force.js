/**
 * @fileoverview Detects the abuse of the { force: true } flag in Playwright interactions.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem", 
    docs: {
      description: "The use of { force: true } ignores Playwright's native actionability validations.",
      category: "Best Practices",
      recommended: true,
    },
    hasSuggestions: true,
    messages: {
      unjustifiedForce: "Code smell detected: Unjustified forced action.",
      removeForce: "Suggestion: Remove the coercion flag ({ force: true })",
      // NEW: Added the option designed in your catalog
      replaceWithExpect: "Suggestion: Replace with explicit visibility assertion"
    },
    schema: [],
  },

  create(context) {
    // Get the object that allows us to read the original source code text
    const sourceCode = context.sourceCode || context.getSourceCode(); 

    return {
      CallExpression(node) {
        if (node.callee && node.callee.type === "MemberExpression") {
          for (const arg of node.arguments) {
            if (arg.type === "ObjectExpression") {
              for (const prop of arg.properties) {
                if (
                  prop.type === "Property" &&
                  prop.key.type === "Identifier" &&
                  prop.key.name === "force" &&
                  prop.value.type === "Literal" &&
                  prop.value.value === true
                ) {
                  context.report({
                    node: prop, 
                    messageId: "unjustifiedForce",
                    suggest: [
                      {
                        messageId: "removeForce",
                        fix: function(fixer) {
                          return fixer.remove(prop);
                        }
                      },
                      // NEW: The suggestion that rewrites the whole block
                      {
                        messageId: "replaceWithExpect",
                        fix: function(fixer) {
                          // 1. Extract the exact locator text (e.g., "page.getByRole('button')")
                          const locatorText = sourceCode.getText(node.callee.object);
                          
                          // 2. Extract the original action (e.g., "click", "fill")
                          const methodName = node.callee.property.name;
                          
                          // 3. Build the new code. 
                          // Note: Since the original line already has an "await" at the beginning,
                          // replacing the node leaves the code perfectly formatted.
                          const replacementText = `expect(${locatorText}).toBeVisible();\n          await ${locatorText}.${methodName}()`;
                          
                          // Replace the entire function call
                          return fixer.replaceText(node, replacementText);
                        }
                      }
                    ]
                  });
                }
              }
            }
          }
        }
      },
    };
  },
};