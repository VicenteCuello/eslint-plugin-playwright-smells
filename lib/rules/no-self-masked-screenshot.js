/**
 * @fileoverview Detects and forbids masking the same element that is being visually captured.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Avoid masking the same element that is evaluated in toHaveScreenshot.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#self-masked-screenshot"
    },
    hasSuggestions: false, // Architectural solution: requires human redesign
    messages: {
      selfMasked: "Code smell detected: Self-masked screenshot. You are applying a mask over the exact element you are trying to visually evaluate, nullifying the VRT test."
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();

    return {
      CallExpression(node) {
        // Look for expect(...).toHaveScreenshot(...)
        if (node.callee && node.callee.type === "MemberExpression") {
          if (node.callee.property.name === "toHaveScreenshot") {
            const expectCall = node.callee.object;
            
            // Verify it comes from an expect()
            if (expectCall && expectCall.type === "CallExpression" && expectCall.callee.name === "expect") {
              const targetLocator = expectCall.arguments[0];
              if (!targetLocator) return;
              
              // Get the text of the target locator (e.g., "modLocator")
              const targetText = sourceCode.getText(targetLocator).trim();

              // Look for the configuration object in the toHaveScreenshot arguments
              const optionsArg = node.arguments.find(arg => arg.type === "ObjectExpression");
              
              if (optionsArg) {
                // Look for the 'mask' property
                const maskProp = optionsArg.properties.find(p => p.key && p.key.name === "mask");
                
                if (maskProp && maskProp.value.type === "ArrayExpression") {
                  const maskElements = maskProp.value.elements;
                  
                  // Check if any element in the mask is equal to the target
                  for (const element of maskElements) {
                    if (element && sourceCode.getText(element).trim() === targetText) {
                      context.report({
                        node: maskProp, // Specifically highlight the mask property
                        messageId: "selfMasked"
                      });
                      break; // Report once and exit
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
  }
};