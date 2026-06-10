/**
 * @fileoverview Detects the use of .click() on elements that appear to be checkboxes or radio buttons.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Avoid using .click() on boolean elements. Use .check() or .uncheck() to ensure idempotency.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#inappropriate-boolean-action"
    },
    hasSuggestions: true,
    messages: {
      inappropriateBoolean: "Code smell detected: Blind click on a boolean element. Using .click() inverts the state without guaranteeing the final outcome.",
      replaceWithCheck: "Suggestion: Replace with .check() to guarantee the 'checked' state",
      replaceWithUncheck: "Suggestion: Replace with .uncheck() to guarantee the 'unchecked' state"
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();

    return {
      CallExpression(node) {
        if (node.callee && node.callee.type === "MemberExpression") {
          
          // Verify if the invoked method is "click"
          if (node.callee.property.name === "click") {
            const callerNode = node.callee.object;
            const callerText = sourceCode.getText(callerNode).toLowerCase();

            // Heuristic: Infer if the element is boolean by analyzing its locator or variable
            if (callerText.includes("checkbox") || callerText.includes("radio")) {
              context.report({
                node: node.callee.property, // Specifically highlight the word "click"
                messageId: "inappropriateBoolean",
                suggest: [
                  {
                    messageId: "replaceWithCheck",
                    fix: fixer => fixer.replaceText(node.callee.property, "check")
                  },
                  {
                    messageId: "replaceWithUncheck",
                    fix: fixer => fixer.replaceText(node.callee.property, "uncheck")
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