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
        
        // Extracts the underlying CallExpression skipping 'await' and variable declarations (const x = await...)
        const getCoreCall = (stmt) => {
          if (stmt.type === 'ExpressionStatement') {
            return stmt.expression.type === 'AwaitExpression' 
              ? stmt.expression.argument 
              : stmt.expression;
          }
          if (stmt.type === 'VariableDeclaration') {
            const init = stmt.declarations[0].init;
            return (init && init.type === 'AwaitExpression') 
              ? init.argument 
              : init;
          }
          return null;
        };

        for (let i = 0; i < body.length - 1; i++) {
          const stmt1 = body[i];
          const stmt2 = body[i + 1];
          
          const call1 = getCoreCall(stmt1);
          const call2 = getCoreCall(stmt2);

          // If either line is not a direct function execution, ignore it
          if (!call1 || !call2 || call1.type !== 'CallExpression' || call2.type !== 'CallExpression') {
            continue;
          }

          // Structural Validation 1: Does line 1 explicitly execute a full navigation?
          const isMemberNav = call1.callee.type === 'MemberExpression' && 
                    ['goto', 'reload', 'goBack'].includes(call1.callee.property.name);

          const isIdentifierNav = call1.callee.type === 'Identifier' && 
                    ['gotoPage'].includes(call1.callee.name);

          const isNavigation = isMemberNav || isIdentifierNav;

          // Structural Validation 2: Does line 2 explicitly execute an evaluation?
          const isEvaluate = call2.callee.type === 'MemberExpression' && 
                           ['evaluate', 'evaluateHandle'].includes(call2.callee.property.name);

          if (isNavigation && isEvaluate) {
            
            // Minor textual validation: Avoid false positives if the developer has already protected the code
            const text2 = sourceCode.getText(stmt2);
            if (text2.includes("toPass") || text2.includes("poll")) {
              continue;
            }

            context.report({
              node: stmt2,
              messageId: "contextRace",
              suggest: [
                {
                  messageId: "wrapWithToPass",
                  fix: function(fixer) {
                    const cleanEvalCode = text2.replace(/;$/, '');
                    const scaffold = `await expect(async () => {\n  ${cleanEvalCode};\n  // Add your assertion here\n}).toPass({ timeout: 10_000 });`;
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