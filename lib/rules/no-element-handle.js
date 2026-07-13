/**
 * @fileoverview Detects the use of obsolete ElementHandles ($ and $$).
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Avoid using page.$() and page.$$() which generate obsolete and fragile static ElementHandles.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#legacy-elementhandle-usage"
    },
    fixable: "code",
    messages: {
      legacyHandle: "Code smell detected: Obsolete ElementHandle usage. This creates a static pointer that breaks (Stale Element) if the DOM re-renders."
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();

    return {
      CallExpression(node) {
        if (node.callee && node.callee.type === "MemberExpression") {
          const propName = node.callee.property.name;

          // Detect both page.$() and page.$$()
          if (propName === "$" || propName === "$$") {
            context.report({
              node: node.callee.property, // Specifically highlight the $ or $$
              messageId: "legacyHandle",
              fix: function(fixer) {
                // Extract the object (e.g., "page") and the argument (e.g., "'#save'")
                const objectText = sourceCode.getText(node.callee.object);
                const argsText = node.arguments.map(arg => sourceCode.getText(arg)).join(", ");
                
                const replacementText = `${objectText}.locator(${argsText})`;

                // If the call is wrapped in an "await", replace the entire parent block
                if (node.parent && node.parent.type === "AwaitExpression") {
                  return fixer.replaceText(node.parent, replacementText);
                } 
                // If for some reason the user forgot the await, only replace the function
                else {
                  return fixer.replaceText(node, replacementText);
                }
              }
            });
          }
        }
      }
    };
  }
};