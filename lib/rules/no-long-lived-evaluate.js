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
    hasSuggestions: false, // Requires human architectural redesign (Promise -> Polling)
    messages: {
      longLivedEvaluate: "Code smell detected: Asynchronous evaluate block. Injecting long-lived promises into evaluate() causes 'Execution context destroyed' errors if a navigation occurs. Redesign using page.waitForFunction()."
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();

    return {
      CallExpression(node) {
        if (node.callee && node.callee.type === "MemberExpression") {
          const isEvaluate = node.callee.property.name === "evaluate" || node.callee.property.name === "evaluateHandle";
          
          if (isEvaluate && node.arguments.length > 0) {
            const callback = node.arguments[0];
            const callbackText = sourceCode.getText(callback);

            // Heuristic to detect asynchrony or promises inside evaluate
            const isAsyncFunction = callback.async === true;
            const containsThen = /\.then\s*\(/.test(callbackText);
            const containsNewPromise = /new\s+Promise/.test(callbackText);
            const containsAwait = /\bawait\b/.test(callbackText);

            if (isAsyncFunction || containsThen || containsNewPromise || containsAwait) {
              context.report({
                node: node.callee.property, // Specifically highlight the word "evaluate"
                messageId: "longLivedEvaluate"
              });
            }
          }
        }
      }
    };
  }
};