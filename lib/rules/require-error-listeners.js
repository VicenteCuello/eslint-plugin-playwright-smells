/**
 * @fileoverview Enforces the presence of network or console listeners to avoid false positives.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Require listeners (page.on) to catch hidden network or console errors.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#network-and-console-blindness"
    },
    hasSuggestions: false, // The exact implementation depends on business rules
    messages: {
      missingListeners: "Code smell detected: Blindness to underlying failures. This file contains tests but does not register error listeners ('console', 'pageerror', 'requestfailed'). Implement a page.on() to ensure background failures do not go unnoticed."
    },
    schema: [],
  },

  create(context) {
    let hasTest = false;
    let hasErrorListener = false;
    let firstTestNode = null;
    let hasPageUsage = false;

    const monitoredEvents = ["console", "pageerror", "requestfailed", "response"];

    return {
      Identifier(node) {
        if (node.name === "page") {
          hasPageUsage = true;
        }
      },
      CallExpression(node) {
        // 1. Detect if the file contains test() blocks
        const hooks = ["beforeAll", "beforeEach", "afterAll", "afterEach"];
        if (node.callee.type === "Identifier" && node.callee.name === "test") {
          hasTest = true;
          if (!firstTestNode) {
            firstTestNode = node; // Save the first test to highlight it with the error
          }
        }
        else if (node.callee.type === "MemberExpression" && node.callee.object.name === "test") {
          const propName = node.callee.property.name;
          // Explicitly exclude hooks so as not to anchor the error to them.
          if (!hooks.includes(propName)) {
            hasTest = true;
            if (!firstTestNode) firstTestNode = node;
          }
        }

        // 2. Detect if there are calls to page.on('event')
        if (node.callee.type === "MemberExpression" && node.callee.property.name === "on") {
          const args = node.arguments;
          if (args.length > 0 && (args[0].type === "Literal" || args[0].type === "TemplateLiteral")) {
            const eventName = args[0].value;
            if (monitoredEvents.includes(eventName)) {
              hasErrorListener = true;
            }
          }
        }
      },

      // 3. Upon finishing reading the entire file, we evaluate
      "Program:exit"() {
        if (hasTest && hasPageUsage && !hasErrorListener && firstTestNode) {
          context.report({
            node: firstTestNode.callee,
            messageId: "missingListeners"
          });
        }
      }
    };
  }
};