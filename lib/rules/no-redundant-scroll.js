/**
 * @fileoverview Detects and forbids the use of scrollIntoViewIfNeeded before native actions.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Avoid using manual scroll before actions like click() that already auto-scroll.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#redundant-manual-scroll"
    },
    fixable: "code",
    messages: {
      redundantScroll: "Code smell detected: Redundant manual scroll. Playwright automatically scrolls elements into view when using action methods like click() or hover()."
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();
    const autoScrollingActions = ["click", "dblclick", "fill", "hover", "check", "uncheck", "tap", "dragTo"];

    // Helper function to extract the locator name and the called method
    function getLocatorCallDetails(stmt) {
      if (!stmt || stmt.type !== "ExpressionStatement") return null;
      let expr = stmt.expression;
      if (expr.type === "AwaitExpression") expr = expr.argument;
      
      if (expr && expr.type === "CallExpression" && expr.callee.type === "MemberExpression") {
        return {
          locatorText: sourceCode.getText(expr.callee.object),
          methodName: expr.callee.property.name
        };
      }
      return null;
    }

    return {
      BlockStatement(node) {
        const body = node.body;
        
        for (let i = 0; i < body.length - 1; i++) {
          const stmt1 = body[i];
          const stmt2 = body[i + 1];

          const details1 = getLocatorCallDetails(stmt1);
          const details2 = getLocatorCallDetails(stmt2);

          // If the first line is a manual scroll
          if (details1 && details1.methodName === "scrollIntoViewIfNeeded") {
            
            // If the second line is an auto-scrolling action ON THE SAME locator
            if (details2 && 
                autoScrollingActions.includes(details2.methodName) && 
                details1.locatorText === details2.locatorText) {
              
              context.report({
                node: stmt1, // Highlight the useless scroll
                messageId: "redundantScroll",
                fix: fixer => {
                  // Remove the manual scroll line completely
                  return fixer.remove(stmt1);
                }
              });
            }
          }
        }
      }
    };
  }
};