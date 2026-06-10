/**
 * @fileoverview Detects and forbids the use of conditional logic based on UI state.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Avoid conditional logic (if/else) based on asynchronous UI states. Tests must be deterministic.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#conditional-ui-testing"
    },
    hasSuggestions: false, // This case cannot have Autofix, it requires human restructuring
    messages: {
      conditionalUI: "Code smell detected: Conditional logic in the test. E2E tests must be deterministic. Control the state of your environment instead of using if/else to bypass intermittent elements."
    },
    schema: [],
  },

  create(context) {
    const stateInspectors = ["isVisible", "isHidden", "isChecked", "isDisabled", "isEnabled", "isEditable"];

    // Recursive function to search for asynchronous Playwright calls within the IF condition
    function containsUIStateCheck(node) {
      if (!node) return false;

      // If we find an AwaitExpression, we check what it is waiting for
      if (node.type === "AwaitExpression" && node.argument.type === "CallExpression") {
        let callee = node.argument.callee;
        
        // Handle the chained case: await locator.isVisible().catch()
        if (callee.type === "MemberExpression" && callee.property.name === "catch" && callee.object.type === "CallExpression") {
          callee = callee.object.callee;
        }

        if (callee.type === "MemberExpression" && stateInspectors.includes(callee.property.name)) {
          return true;
        }
      }

      // Scan logical operators (e.g., if (await loc1.isVisible() && await loc2.isVisible()))
      if (node.type === "LogicalExpression" || node.type === "BinaryExpression") {
        return containsUIStateCheck(node.left) || containsUIStateCheck(node.right);
      }

      // Scan negations (e.g., if (!await loc.isVisible()))
      if (node.type === "UnaryExpression") {
        return containsUIStateCheck(node.argument);
      }

      return false;
    }

    return {
      IfStatement(node) {
        if (containsUIStateCheck(node.test)) {
          context.report({
            node: node.test, // Highlight the problematic condition
            messageId: "conditionalUI"
          });
        }
      },
      ConditionalExpression(node) { // For ternary operators: await loc.isVisible() ? a : b
        if (containsUIStateCheck(node.test)) {
          context.report({
            node: node.test,
            messageId: "conditionalUI"
          });
        }
      }
    };
  }
};