/**
 * @fileoverview Detects and forbids the use of try/catch to mask assertions and conditionals based on isVisible.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Avoid flow control with exceptions for assertions and the isVisible() conditional trap.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#try-catch--conditional-flow-control"
    },
    hasSuggestions: false, 
    messages: {
      tryCatchExpect: "Code smell detected: Exception-based flow control. Wrapping 'expect' in a try/catch masks application failures and breaks determinism.",
      isVisibleTrap: "Code smell detected: The isVisible() trap. Using isVisible() in a conditional evaluates the DOM instantaneously without auto-waiting, causing false negatives due to latency."
    },
    schema: [],
  },

  create(context) {
    return {
      // 1. Detection of the isVisible() trap in conditionals
      IfStatement(node) {
        // Recursive function to search for isVisible/isHidden inside the IF condition
        function hasIsVisible(expr) {
          if (!expr) return false;
          if (expr.type === "AwaitExpression") return hasIsVisible(expr.argument);
          if (expr.type === "UnaryExpression") return hasIsVisible(expr.argument);
          if (expr.type === "LogicalExpression" || expr.type === "BinaryExpression") {
            return hasIsVisible(expr.left) || hasIsVisible(expr.right);
          }
          if (expr.type === "CallExpression" && expr.callee.type === "MemberExpression") {
            const name = expr.callee.property.name;
            if (name === "isVisible" || name === "isHidden") {
              return true;
            }
          }
          return false;
        }

        if (hasIsVisible(node.test)) {
          context.report({
            node: node.test, 
            messageId: "isVisibleTrap"
          });
        }
      },

      // 2. Detection of assertion masking in try/catch
      TryStatement(node) {
        if (!node.handler) {
          return; 
        }

        const tryBody = node.block.body;
        
        // Review instructions directly inside the try block
        for (const stmt of tryBody) {
          if (stmt.type === "ExpressionStatement") {
            let expr = stmt.expression;
            if (expr.type === "AwaitExpression") expr = expr.argument;
            
            // Verify if the expression is an expect() call
            if (expr && expr.type === "CallExpression" && expr.callee.type === "MemberExpression") {
              if (expr.callee.object && 
                  expr.callee.object.type === "CallExpression" && 
                  expr.callee.object.callee.name === "expect") {
                
                context.report({
                  node: stmt,
                  messageId: "tryCatchExpect"
                });
              }
            }
          }
        }
      }
    };
  }
};