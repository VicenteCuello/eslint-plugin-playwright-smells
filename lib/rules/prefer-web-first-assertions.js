/**
 * @fileoverview Detects eager assertions that break Playwright's auto-retrying.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Prefer Web-First assertions instead of extracting values synchronously.",
      category: "Best Practices",
      recommended: true,
    },
    hasSuggestions: true,
    messages: {
      eagerAssertion: "Code smell detected: Eager (non-web-first) assertion. Interrupts auto-retrying.",
      replaceWithToBeVisible: "Suggestion: Replace with await expect(locator).toBeVisible()",
      replaceWithToHaveURL: "Suggestion: Replace with await expect(page).toHaveURL(...)",
      replaceWithToHaveAttribute: "Suggestion: Replace with await expect(locator).toHaveAttribute(...)"
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();

    return {
      // Look for any chain of the type expect(...).matcher(...)
      CallExpression(node) {
        if (node.callee && node.callee.type === "MemberExpression") {
          const expectCall = node.callee.object;

          if (expectCall && expectCall.type === "CallExpression" && expectCall.callee.name === "expect") {
            const expectArg = expectCall.arguments[0];
            if (!expectArg) return;

            // CASE 1: expect(await locator.isVisible()).toBe(true)
            if (expectArg.type === "AwaitExpression" && expectArg.argument.type === "CallExpression") {
              const innerCall = expectArg.argument;
              if (innerCall.callee.type === "MemberExpression" && innerCall.callee.property.name === "isVisible") {
                context.report({
                  node: node,
                  messageId: "eagerAssertion",
                  suggest: [{
                    messageId: "replaceWithToBeVisible",
                    fix: function(fixer) {
                      const locatorText = sourceCode.getText(innerCall.callee.object);
                      return fixer.replaceText(node, `await expect(${locatorText}).toBeVisible()`);
                    }
                  }]
                });
              }
            }

            // CASE 2: expect(page.url()).toEqual('https...')
            else if (expectArg.type === "CallExpression" && expectArg.callee.type === "MemberExpression") {
              if (expectArg.callee.property.name === "url") {
                context.report({
                  node: node,
                  messageId: "eagerAssertion",
                  suggest: [{
                    messageId: "replaceWithToHaveURL",
                    fix: function(fixer) {
                      const pageText = sourceCode.getText(expectArg.callee.object);
                      // Extract whatever was put inside .toEqual()
                      const expectedUrlText = node.arguments.length > 0 ? sourceCode.getText(node.arguments[0]) : "''";
                      return fixer.replaceText(node, `await expect(${pageText}).toHaveURL(${expectedUrlText})`);
                    }
                  }]
                });
              }
            }

            // CASE 3: const val = await locator.getAttribute('attr'); expect(val).toBe('val')
            else if (expectArg.type === "Identifier") {
              const variableName = expectArg.name;
              
              // Traverse up the tree to find the block (e.g., the function or test)
              let block = node.parent;
              while (block && block.type !== "BlockStatement" && block.type !== "Program") {
                block = block.parent;
              }

              if (block) {
                // Look inside the block for the variable declaration
                for (const stmt of block.body) {
                  if (stmt.type === "VariableDeclaration") {
                    for (const decl of stmt.declarations) {
                      if (decl.id.name === variableName && decl.init) {
                        
                        // Verify if the variable was declared using getAttribute
                        if (decl.init.type === "AwaitExpression" && decl.init.argument.type === "CallExpression") {
                          const innerCall = decl.init.argument;
                          if (innerCall.callee.type === "MemberExpression" && innerCall.callee.property.name === "getAttribute") {
                            
                            context.report({
                              node: node,
                              messageId: "eagerAssertion",
                              suggest: [{
                                messageId: "replaceWithToHaveAttribute",
                                fix: function(fixer) {
                                  const locatorText = sourceCode.getText(innerCall.callee.object);
                                  const attrNameText = innerCall.arguments.length > 0 ? sourceCode.getText(innerCall.arguments[0]) : "''";
                                  const expectedValueText = node.arguments.length > 0 ? sourceCode.getText(node.arguments[0]) : "''";
                                  
                                  return fixer.replaceText(node, `await expect(${locatorText}).toHaveAttribute(${attrNameText}, ${expectedValueText})`);
                                }
                              }]
                            });
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
  },
};