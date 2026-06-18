/**
 * @fileoverview Detects the use of synchronous .count() followed by an assertion, which interrupts auto-waiting.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Avoid premature counting without auto-waiting. Use toHaveCount() instead.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#premature-counting-assertion-without-auto-wait"
    },
    fixable: "code",
    messages: {
      prematureCounting: "Code smell detected: Counting Assertion Without Auto-Wait. .count() resolves immediately to 0 if the element hasn't rendered yet."
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();

    return {
      CallExpression(node) {
        // Look for patterns: expect(something).toBe(x) or expect(something).toEqual(x)
        if (node.callee && node.callee.type === "MemberExpression") {
          const expectCall = node.callee.object;
          
          if (expectCall && expectCall.type === "CallExpression" && expectCall.callee.name === "expect") {
            const matcherName = node.callee.property.name;
            const expectArg = expectCall.arguments[0];

            if (!expectArg || !["toBe", "toEqual"].includes(matcherName)) return;

            // Internal function to inject the Web-First solution directly
            const reportSmell = (locatorNode) => {
              context.report({
                node: node, // Highlight the entire assertion
                messageId: "prematureCounting",
                fix: fixer => {
                  // Extract the original locator (e.g., page.getByText("Message"))
                  const locatorText = sourceCode.getText(locatorNode.callee.object);
                  // Extract the expected number (e.g., 1)
                  const expectedVal = node.arguments.length > 0 ? sourceCode.getText(node.arguments[0]) : "0";
                  
                  return fixer.replaceText(node, `await expect(${locatorText}).toHaveCount(${expectedVal})`);
                }
              });
            };

            // CASE 1: Direct assertion -> expect(await locator.count()).toBe(1)
            if (expectArg.type === "AwaitExpression" && expectArg.argument.type === "CallExpression") {
              const innerCall = expectArg.argument;
              if (innerCall.callee.type === "MemberExpression" && innerCall.callee.property.name === "count") {
                reportSmell(innerCall);
              }
            }

            // CASE 2: Variable assertion -> const msgs = await locator.count(); expect(msgs).toBe(1);
            else if (expectArg.type === "Identifier") {
              const varName = expectArg.name;
              
              // Traverse up the AST to the function block
              let block = node.parent;
              while (block && block.type !== "BlockStatement" && block.type !== "Program") { 
                block = block.parent; 
              }

              if (block) {
                // Scan the block looking for where that variable was declared
                for (const stmt of block.body) {
                  if (stmt.type === "VariableDeclaration") {
                    for (const decl of stmt.declarations) {
                      if (decl.id.name === varName && decl.init && decl.init.type === "AwaitExpression" && decl.init.argument.type === "CallExpression") {
                        const innerCall = decl.init.argument;
                        // If the variable was initialized using .count(), trigger the error
                        if (innerCall.callee.type === "MemberExpression" && innerCall.callee.property.name === "count") {
                          reportSmell(innerCall);
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
  }
};