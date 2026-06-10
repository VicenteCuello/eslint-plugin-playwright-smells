/**
 * @fileoverview Detects meaningless assertions that evaluate Playwright objects instead of the DOM.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Avoid assertions about the in-memory existence of the page object or locators.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#meaningless-ui-assertions"
    },
    hasSuggestions: true,
    messages: {
      meaninglessAssertion: "Code smell detected: Meaningless assertion. You are evaluating the existence of the object in memory, not the actual state of the DOM.",
      replaceWithVisible: "Suggestion: Replace with a visibility assertion on a key element (toBeVisible)"
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();

    return {
      CallExpression(node) {
        if (node.callee && node.callee.type === "MemberExpression") {
          const expectCall = node.callee.object;
          
          if (expectCall && expectCall.type === "CallExpression" && expectCall.callee.name === "expect") {
            const matcherName = node.callee.property.name;
            const expectArg = expectCall.arguments[0];

            // Look for matchers that are often incorrectly used to evaluate "existence"
            if (!expectArg || !["toBeTruthy", "toBeDefined"].includes(matcherName)) return;

            let isPlaywrightObject = false;
            let locatorText = "page.locator('#app')";

            // Case A: expect(page).toBeTruthy()
            if (expectArg.type === "Identifier" && expectArg.name === "page") {
              isPlaywrightObject = true;
            }
            // Case B: expect(page.locator('.btn')).toBeTruthy()
            else if (expectArg.type === "CallExpression" && expectArg.callee.type === "MemberExpression") {
              const methodName = expectArg.callee.property.name;
              
              // If it is a Playwright method that returns a Locator
              if (methodName === "locator" || methodName.startsWith("getBy")) {
                isPlaywrightObject = true;
                locatorText = sourceCode.getText(expectArg);
              }
            }

            if (isPlaywrightObject) {
              context.report({
                node: node, // Highlight the complete assertion
                messageId: "meaninglessAssertion",
                suggest: [
                  {
                    messageId: "replaceWithVisible",
                    fix: fixer => {
                      return fixer.replaceText(node, `await expect(${locatorText}).toBeVisible()`);
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