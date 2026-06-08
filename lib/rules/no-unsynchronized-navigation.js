/**
 * @fileoverview Detects unsynchronized navigations by not waiting for the URL after a click.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Missing synchronization after a navigation. You must use waitForURL before evaluating the new view.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#unsynchronized-navigation"
    },
    hasSuggestions: true,
    messages: {
      unsynchronizedNav: "Code smell detected: Possible unsynchronized navigation. If this click changes the page, the test will attempt to act on an obsolete DOM.",
      addWaitForURL: "Suggestion: Inject await page.waitForURL() before the assertion"
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();

    // Helper function to detect if a line is a click() (e.g., await page.click(...) or await locator.click())
    function isClickStatement(stmt) {
      if (stmt.type !== "ExpressionStatement") return false;
      const expr = stmt.expression;
      if (expr.type !== "AwaitExpression") return false;
      const call = expr.argument;
      if (call.type !== "CallExpression") return false;
      if (call.callee.type !== "MemberExpression") return false;
      
      // Optional heuristic: if we want to be precise, we verify that it is a click
      return call.callee.property.name === "click";
    }

    // Helper function to detect if a line is an expect()
    function isExpectStatement(stmt) {
      if (stmt.type !== "ExpressionStatement") return false;
      let expr = stmt.expression;
      if (expr.type === "AwaitExpression") expr = expr.argument; // May or may not have an await
      if (expr.type === "CallExpression" && expr.callee.type === "MemberExpression") {
        if (expr.callee.object && expr.callee.object.type === "CallExpression" && expr.callee.object.callee.name === "expect") {
          return true;
        }
      }
      return false;
    }

    return {
      BlockStatement(node) {
        const body = node.body;
        
        // Iterate through all lines of the code block
        for (let i = 0; i < body.length - 1; i++) {
          const stmt = body[i];
          const nextStmt = body[i + 1];

          if (isClickStatement(stmt) && isExpectStatement(nextStmt)) {
            
            // Analyze the click argument to see if it is prone to navigating (e.g., contains 'href' or 'a')
            const clickCall = stmt.expression.argument;
            let looksLikeNavigation = false;

            if (clickCall.arguments.length > 0) {
               const argText = sourceCode.getText(clickCall.arguments[0]);
               if (argText.includes('href') || argText.includes('a[')) {
                 looksLikeNavigation = true;
               }
            }

            // If it is a click on a link followed by an expect, trigger the code smell
            if (looksLikeNavigation) {
              context.report({
                node: stmt, // Highlight the problematic click
                messageId: "unsynchronizedNav",
                suggest: [
                  {
                    messageId: "addWaitForURL",
                    fix: function(fixer) {
                      // Get the original text of the click and append the URL wait below it
                      const clickText = sourceCode.getText(stmt);
                      const replacement = `${clickText}\n          await page.waitForURL('**/YOUR_URL_HERE');`;
                      return fixer.replaceText(stmt, replacement);
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