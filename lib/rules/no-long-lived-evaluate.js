/**
 * @fileoverview Detects page.evaluate() blocks that contain long-lived promises.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Avoid long-lived promises or waits inside page.evaluate().",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#long-lived-evaluate-blocks"
    },
    hasSuggestions: false, 
    messages: {
      longLivedEvaluate: "Code smell detected: Asynchronous evaluate block. Injecting long-lived promises into evaluate() causes 'Execution context destroyed' errors if a navigation occurs. Redesign using page.waitForFunction()."
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        if (node.callee && node.callee.type === "MemberExpression") {
          const isEvaluate = node.callee.property.name === "evaluate" || node.callee.property.name === "evaluateHandle";
          
          if (isEvaluate && node.arguments.length > 0) {
            let callerName = "";
            
            // If it is a direct call like page.evaluate()
            if (node.callee.object.type === "Identifier") {
              callerName = node.callee.object.name; 
            } 
            // If it is a nested call like tronApp.electron.evaluate()
            else if (node.callee.object.type === "MemberExpression") {
              callerName = node.callee.object.property.name; 
            }

            // Exclude engines that do not suffer from context destruction due to web navigation
            const safeCallers = ["electron", "electronApp"];
            if (safeCallers.includes(callerName)) {
              return; 
            }

            const callback = node.arguments[0];
            let isLongLived = false;

            // Strictly verify the structure of the injected function
            if (callback.type === "ArrowFunctionExpression" || callback.type === "FunctionExpression") {
              
              // 1. Was the main function declared as 'async'?
              if (callback.async) {
                isLongLived = true;
              } else {
                // 2. Does it implicitly return a promise? (E.g.: () => new Promise(...) or () => obj.then(...))
                const isImplicitPromise = callback.body.type === "NewExpression" && callback.body.callee.name === "Promise";
                const isImplicitThen = callback.body.type === "CallExpression" && callback.body.callee.property && callback.body.callee.property.name === "then";

                if (isImplicitPromise || isImplicitThen) {
                  isLongLived = true;
                } 
                // 3. Does it explicitly return a promise at its first level? (E.g.: { return new Promise(...) })
                else if (callback.body.type === "BlockStatement") {
                  for (const stmt of callback.body.body) {
                    if (stmt.type === "ReturnStatement" && stmt.argument) {
                      const isExplicitPromise = stmt.argument.type === "NewExpression" && stmt.argument.callee.name === "Promise";
                      const isExplicitThen = stmt.argument.type === "CallExpression" && stmt.argument.callee.property && stmt.argument.callee.property.name === "then";
                      
                      if (isExplicitPromise || isExplicitThen) {
                        isLongLived = true;
                        break;
                      }
                    }
                  }
                }
              }
            }

            if (isLongLived) {
              context.report({
                node: node.callee.property, 
                messageId: "longLivedEvaluate"
              });
            }
          }
        }
      }
    };
  }
};