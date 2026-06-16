/**
 * @fileoverview Detects and forbids the use of test.describe.serial to protect test isolation.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Forbid the use of test.describe.serial to maintain absolute isolation between tests.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#serial-execution-abuse"
    },
    hasSuggestions: false, // Architectural solution: requires grouping logic in test.step()
    messages: {
      serialAbuse: "Code smell detected: Serial execution abuse. 'test.describe.serial' couples tests and destroys isolation. Use 'test.step' within a single test or isolate preconditions."
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        if (node.callee && node.callee.type === "MemberExpression") {
          const prop = node.callee.property;
          const obj = node.callee.object;

          // Look for the property to be 'serial' and the object to be 'test.describe'
          if (prop && prop.name === "serial" && obj && obj.type === "MemberExpression") {
            if (obj.object.name === "test" && obj.property.name === "describe") {
              
              context.report({
                node: prop, // Specifically highlight the word "serial"
                messageId: "serialAbuse"
              });
            }
          }
        }
      }
    };
  }
};