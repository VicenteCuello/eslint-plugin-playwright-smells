/**
 * @fileoverview Detects and prevents race conditions when waiting for events after an action.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Prevents race conditions by enforcing listener registration before actions.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#sequential-event-race-condition"
    },
    hasSuggestions: true,
    messages: {
      sequentialListener: "Code smell detected: Race condition. You are registering '{{method}}' after an action. If the network is fast, the event will occur before the listener is active, hanging the test.",
      useVariableAssign: "Suggestion 1: Extract the listener to a variable (Pending Promise).",
      usePromiseAll: "Suggestion 2: Execute concurrently with Promise.all()."
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();
    const listeners = ["waitForResponse", "waitForRequest", "waitForEvent"];

    function getAwaitCallDetails(stmt) {
      if (!stmt || stmt.type !== "ExpressionStatement") return null;
      const expr = stmt.expression;
      if (expr.type !== "AwaitExpression") return null;
      
      const call = expr.argument;
      if (call.type === "CallExpression" && call.callee.type === "MemberExpression") {
        return {
          methodName: call.callee.property.name,
          fullText: sourceCode.getText(call) // Extracts the statement without the "await" or the ";"
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

          const details1 = getAwaitCallDetails(stmt1);
          const details2 = getAwaitCallDetails(stmt2);

          if (details1 && details2 && listeners.includes(details2.methodName)) {
            
            context.report({
              node: stmt2,
              messageId: "sequentialListener",
              data: { method: details2.methodName },
              suggest: [
                {
                  messageId: "useVariableAssign",
                  fix: fixer => {
                    const actionText = sourceCode.getText(stmt1); // With await and ;
                    const listenerText = details2.fullText; // Without await
                    
                    const replacement = `const eventPromise = ${listenerText};\n          ${actionText}\n          await eventPromise;`;
                    return fixer.replaceTextRange([stmt1.range[0], stmt2.range[1]], replacement);
                  }
                },
                {
                  messageId: "usePromiseAll",
                  fix: fixer => {
                    const actionText = details1.fullText; // Without await
                    const listenerText = details2.fullText; // Without await
                    
                    // Build the Promise.all syntax respecting indentation
                    const replacement = `await Promise.all([\n            ${listenerText},\n            ${actionText}\n          ]);`;
                    return fixer.replaceTextRange([stmt1.range[0], stmt2.range[1]], replacement);
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