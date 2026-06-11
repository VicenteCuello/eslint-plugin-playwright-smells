/**
 * @fileoverview Requires a toBeInViewport() assertion after using scrollIntoViewIfNeeded().
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Require a viewport assertion after a manual scroll to prevent off-screen clicks.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#missing-viewport-assertion"
    },
    hasSuggestions: true,
    messages: {
      missingViewport: "Code smell detected: Missing assertion after scroll. Executing actions immediately after forcing a scroll can cause clicks on obsolete coordinates if the browser hasn't finished painting.",
      addViewportAssertion: "Suggestion: Inject await expect(locator).toBeInViewport() to confirm the scroll"
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();

    // Helper function to extract the locator node if the line is a scrollIntoViewIfNeeded
    function getScrollCaller(stmt) {
      if (stmt.type !== "ExpressionStatement") return null;
      let expr = stmt.expression;
      if (expr.type === "AwaitExpression") expr = expr.argument;
      
      if (expr && expr.type === "CallExpression" && expr.callee.type === "MemberExpression") {
        if (expr.callee.property.name === "scrollIntoViewIfNeeded") {
          return expr.callee.object; // Returns the locator (e.g., "footnoteRef")
        }
      }
      return null;
    }

    // Helper function to verify if the line is a toBeInViewport assertion
    function isViewportAssertion(stmt) {
      if (!stmt || stmt.type !== "ExpressionStatement") return false;
      let expr = stmt.expression;
      if (expr.type === "AwaitExpression") expr = expr.argument;
      
      if (expr && expr.type === "CallExpression" && expr.callee.type === "MemberExpression") {
        if (expr.callee.property.name === "toBeInViewport") {
          const expectCall = expr.callee.object;
          if (expectCall.type === "CallExpression" && expectCall.callee.name === "expect") {
            return true;
          }
        }
      }
      return false;
    }

    return {
      BlockStatement(node) {
        const body = node.body;
        
        // Iterate reviewing the code block
        for (let i = 0; i < body.length; i++) {
          const stmt1 = body[i];
          const callerNode = getScrollCaller(stmt1);

          if (callerNode) {
            // Check the next line (if it exists)
            const stmt2 = body[i + 1];

            // If the next line is NOT the expected assertion, report the error
            if (!isViewportAssertion(stmt2)) {
              const locatorText = sourceCode.getText(callerNode);

              context.report({
                node: stmt1, // Highlight the scroll line
                messageId: "missingViewport",
                suggest: [
                  {
                    messageId: "addViewportAssertion",
                    fix: fixer => {
                      // Inject the required assertion right below the scroll
                      return fixer.insertTextAfter(stmt1, `\n          await expect(${locatorText}).toBeInViewport();`);
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