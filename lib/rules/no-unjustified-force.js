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
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#unjustified-forced-action"
    },
    hasSuggestions: true,
    messages: {
      unjustifiedForce: "Code smell detected: Unjustified forced action.",
      removeForce: "Suggestion: Remove the coercion flag ({ force: true })",
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
          const methodName = node.callee.property.name;

          const actionabilityMethods = [
            "click", "dblclick", "fill", "check", "uncheck", 
            "hover", "dragTo", "tap", "selectOption", "selectText"
          ];

          if (!actionabilityMethods.includes(methodName)) {
            return; 
          }

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
                      {
                        messageId: "replaceWithExpect",
                        fix: function(fixer) {
                          const locatorText = sourceCode.getText(node.callee.object);
                          const replacementText = `expect(${locatorText}).toBeVisible();\n          await ${locatorText}.${methodName}()`;
                          
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