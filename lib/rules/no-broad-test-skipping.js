/**
 * @fileoverview Detects and forbids unconditional test skipping to preserve coverage.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Avoid unconditional test.skip(). Use conditional skips based on the environment.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#broad-test-skipping"
    },
    hasSuggestions: false, // Architectural solution: a human must identify the unstable browser
    messages: {
      broadSkip: "Code smell detected: Broad Test Skipping. Disabling tests unconditionally sacrifices coverage across all environments. Limit the skip using a condition (e.g., test.skip(browserName === 'webkit'))."
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        if (node.callee && node.callee.type === "MemberExpression") {
          const prop = node.callee.property;
          const obj = node.callee.object;

          let isSkip = false;

          // Detect test.skip()
          if (obj.name === "test" && prop.name === "skip") {
            isSkip = true;
          }
          // Detect test.describe.skip()
          else if (obj.type === "MemberExpression" &&
                   obj.object.name === "test" &&
                   obj.property.name === "describe" &&
                   prop.name === "skip") {
            isSkip = true;
          }

          if (isSkip) {
            const args = node.arguments;

            // Case 1: test.skip('title', () => { ... })
            // (The entire test is wrapped in an unconditional skip)
            const isBlockSkip = args.length >= 2 &&
              (args[1].type === "ArrowFunctionExpression" || args[1].type === "FunctionExpression");

            // Case 2: test.skip() or test.skip('Reason') inside the code
            // (If it only has 0 or 1 argument and it is a string, there is no condition)
            const isInlineUnconditionalSkip = args.length === 0 ||
              (args.length === 1 && (args[0].type === "Literal" || args[0].type === "TemplateLiteral"));

            if (isBlockSkip || isInlineUnconditionalSkip) {
              context.report({
                node: prop, // Specifically highlight the word 'skip'
                messageId: "broadSkip"
              });
            }
          }
        }
      }
    };
  }
};