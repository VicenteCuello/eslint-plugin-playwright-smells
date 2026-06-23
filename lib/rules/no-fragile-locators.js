/**
 * @fileoverview Detects fragile structural locators, positional indexes, and global scans.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Avoid complex structural locators, indexes, and global DOM scans.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#fragile-structural-locators"
    },
    hasSuggestions: true,
    messages: {
      complexSelector: "Code smell detected: Fragile structural locator. Avoid relying on complex CSS or XPath hierarchies.",
      positionalIndex: "Code smell detected: Fragile positional index. Using indexes easily breaks the test if the UI mutates.",
      inexactText: "Code smell detected: Ambiguous text search. Can cause Strict Mode violations.",
      globalScan: "Code smell detected: Assertion Roulette. Scanning the entire document.body generates massive false positives.",
      
      replaceWithTestId: "Suggestion: Replace with a resilient identifier (page.getByTestId)",
      replaceWithSemanticFilter: "Suggestion: Replace with semantic filters (locator + filter + getByRole)",
      
      addExactTrue: "Suggestion: Add { exact: true } to force a strict match",
      replaceWithQuery: "Suggestion: Replace by targeting a specific DOM element"
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        if (node.callee && node.callee.type === "MemberExpression") {
          const propName = node.callee.property.name;

          // 1. Positional indexes radar (.nth, .first, .last)
          if (["nth", "first", "last"].includes(propName)) {
            
            let isLikelyPlaywright = true;
            const playwrightLocators = [
              "locator", "getByRole", "getByText", "getByTestId", 
              "getByLabel", "getByPlaceholder", "getByAltText", "getByTitle",
              "filter", "and", "or"
            ];

            // SCENARIO A: Direct chaining (e.g., page.locator().first())
            if (node.callee.object.type === "CallExpression" && node.callee.object.callee.property) {
              const previousMethod = node.callee.object.callee.property.name;
              if (!playwrightLocators.includes(previousMethod)) {
                isLikelyPlaywright = false;
              }
            } 
            // SCENARIO B: Reference by variable (e.g., const q = mdq().query(); q.first())
            else if (node.callee.object.type === "Identifier") {
              const variableName = node.callee.object.name;
              let block = node.parent;
              
              // Traverse up the tree to the current code block
              while (block && block.type !== "BlockStatement" && block.type !== "Program") {
                block = block.parent;
              }

              if (block) {
                // Look for the original variable declaration
                for (const stmt of block.body) {
                  if (stmt.type === "VariableDeclaration") {
                    for (const decl of stmt.declarations) {
                      if (decl.id.name === variableName && decl.init) {
                        // If the variable originated from a function, verify if it is Playwright
                        if (decl.init.type === "CallExpression" && decl.init.callee.property) {
                          const originMethod = decl.init.callee.property.name;
                          if (!playwrightLocators.includes(originMethod)) {
                            isLikelyPlaywright = false; 
                          }
                        }
                      }
                    }
                  }
                }
              }
            }

            // If detect it is not Playwright (neither direct nor via variable), abort
            if (!isLikelyPlaywright) {
              return;
            }

            context.report({
              node: node.callee.property,
              messageId: "positionalIndex",
              suggest: [
                {
                  messageId: "replaceWithTestId",
                  fix: fixer => fixer.replaceText(node, "page.getByTestId('YOUR_ID_HERE')")
                },
                {
                  messageId: "replaceWithSemanticFilter",
                  fix: fixer => fixer.replaceText(node, "page.locator('YOUR_CONTAINER_HERE').filter({ hasText: 'YOUR_TEXT_HERE' }).getByRole('button', { name: 'YOUR_NAME_HERE' })")
                }
              ]
            });
          }

          // 2. Fragile CSS/XPath selectors radar
          if (propName === "locator" && node.arguments.length > 0) {
            const arg = node.arguments[0];
            if (arg.type === "Literal" && typeof arg.value === "string") {
              if (/>|:nth-child|\/\//.test(arg.value)) {
                context.report({
                  node: arg,
                  messageId: "complexSelector",
                  // Offer both solutions from the catalog
                  suggest: [
                    {
                      messageId: "replaceWithTestId",
                      fix: fixer => fixer.replaceText(node, "page.getByTestId('YOUR_ID_HERE')")
                    },
                    {
                      messageId: "replaceWithSemanticFilter",
                      fix: fixer => fixer.replaceText(node, "page.locator('YOUR_CONTAINER_HERE').filter({ hasText: 'YOUR_TEXT_HERE' }).getByRole('button', { name: 'YOUR_NAME_HERE' })")
                    }
                  ]
                });
              }
            }
          }

          // 3. Unspecific text search radar
          if (propName === "getByText" && node.arguments.length > 0) {
            const arg = node.arguments[0];
            if (arg.type === "Literal" && typeof arg.value === "string") {
              let hasExact = false;
              if (node.arguments.length > 1 && node.arguments[1].type === "ObjectExpression") {
                hasExact = node.arguments[1].properties.some(p => 
                  p.key && p.key.name === "exact" && p.value && p.value.value === true
                );
              }
              if (!hasExact) {
                context.report({
                  node: node,
                  messageId: "inexactText",
                  suggest: [{
                    messageId: "addExactTrue",
                    fix: function(fixer) {
                      if (node.arguments.length === 1) {
                        return fixer.insertTextAfter(arg, ", { exact: true }");
                      }
                      return null;
                    }
                  }]
                });
              }
            }
          }
        }
      },

      // 4. Global DOM scan radar
      MemberExpression(node) {
        if (node.property.name === "textContent" && node.object && node.object.type === "MemberExpression") {
          if (node.object.property.name === "body" && node.object.object && node.object.object.name === "document") {
            context.report({
              node: node,
              messageId: "globalScan",
              suggest: [{
                messageId: "replaceWithQuery",
                fix: fixer => fixer.replaceText(node, "document.querySelector('YOUR_SPECIFIC_SELECTOR').textContent")
              }]
            });
          }
        }
      }
    };
  }
};