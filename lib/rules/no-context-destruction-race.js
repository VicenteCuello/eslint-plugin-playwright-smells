/**
 * @fileoverview Detects calls to page.evaluate() immediately after a navigation, preventing the "Execution context destroyed" error.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Avoid page.evaluate() right after navigating. WebKit can destroy the context at that moment.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#context-destruction-race-condition"
    },
    hasSuggestions: true,
    messages: {
      contextRace: "Code smell detected: Possible execution context race condition. Executing evaluate() right after navigating throws errors if the DOM is purged.",
      wrapWithToPass: "Suggestion: Wrap the evaluation in an expect().toPass() block to tolerate thread instability"
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();

    return {
      BlockStatement(node) {
        const body = node.body;
        
        for (let i = 0; i < body.length - 1; i++) {
          const stmt1 = body[i];
          const stmt2 = body[i + 1];
          const isValidType = (type) => ['ExpressionStatement', 'VariableDeclaration', 'ReturnStatement'].includes(type);
          
          if (!isValidType(stmt1.type) || !isValidType(stmt2.type)) {
            continue;
          }

          const isTestRunnerBlock = (stmt) => {
             return stmt.expression && 
                    stmt.expression.callee && 
                    ['describe', 'test', 'it'].includes(stmt.expression.callee.name);
          };

          if (isTestRunnerBlock(stmt1) || isTestRunnerBlock(stmt2)) {
            continue;
          }

          const text1 = sourceCode.getText(stmt1);
          const text2 = sourceCode.getText(stmt2);

          // Navigation Heuristic: Look for keywords in the previous line (goto, reload, click)
          const looksLikeNavigation = /goto|reload|click/.test(text1);

          // Evaluate Heuristic: Check if the current line is trying to access the browser thread
          const looksLikeEvaluate = /\.evaluate\s*\(/.test(text2);

          if (looksLikeNavigation && looksLikeEvaluate) {
            // Avoid false positives if the code is already inside a poll or toPass
            if (text2.includes("toPass") || text2.includes("poll")) {
              continue;
            }

            context.report({
              node: stmt2, // Specifically highlight the evaluate line
              messageId: "contextRace",
              suggest: [
                {
                  messageId: "wrapWithToPass",
                  fix: function(fixer) {
                    // Extract the original text, remove the semicolon if it has one, and wrap it
                    const cleanEvalCode = text2.replace(/;$/, '');
                    
                    const scaffold = `await expect(async () => {
  ${cleanEvalCode};
  expect(color).toBe(""); // Replace with your actual assertion
}).toPass({ timeout: 10_000 });`;

                    return fixer.replaceText(stmt2, scaffold);
                  }
                }
              ]
            });
          }
        }
      }
    };
  }
};