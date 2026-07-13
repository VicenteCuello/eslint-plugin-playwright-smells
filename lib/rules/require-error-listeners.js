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
    hasSuggestions: false, 
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
    
    let importsPlaywright = false; 
    let hasAction = false;

    const monitoredEvents = ["console", "pageerror", "requestfailed", "response"];

    return {
      // 1. Look for modern import declarations (ES Modules)
      ImportDeclaration(node) {
        if (node.source && node.source.value === "@playwright/test") {
          importsPlaywright = true;
        }
      },

      Identifier(node) {
        if (node.name === "page") {
          hasPageUsage = true;
        }
      },
      
      CallExpression(node) {
        // Support for legacy imports (CommonJS require)
        if (node.callee.name === "require" && 
            node.arguments.length > 0 && 
            node.arguments[0].value === "@playwright/test") {
          importsPlaywright = true;
        }

        // 2. Detect if the file contains test() blocks
        if (node.callee.type === "Identifier" && node.callee.name === "test") {
          hasTest = true;
          if (!firstTestNode) {
            firstTestNode = node; 
          }
        }
        else if (node.callee.type === "MemberExpression" && node.callee.object.name === "test") {
          const propName = node.callee.property.name;
          
          const playwrightTestApi = [
            "describe", "step", "skip", "fail", "fixme", "slow", "setTimeout", "use", "extend"
          ];
          
          if (playwrightTestApi.includes(propName)) {
            hasTest = true;
            if (!firstTestNode) firstTestNode = node;
          }
        }

        // 3. Detect if there are calls to page.on('event')
        if (node.callee.type === "MemberExpression" && node.callee.property.name === "on") {
          const args = node.arguments;
          if (args.length > 0 && (args[0].type === "Literal" || args[0].type === "TemplateLiteral")) {
            const eventName = args[0].value;
            if (monitoredEvents.includes(eventName)) {
              hasErrorListener = true;
            }
          }
        }

        // 4. Detect if there is explicit navigation or assertions
        if (node.callee.type === "Identifier" && node.callee.name === "expect") {
          hasAction = true;
        }
        if (node.callee.type === "MemberExpression" && node.callee.property.name === "goto") {
          hasAction = true;
        }

      },

      // 5. Upon finishing reading the entire file, we evaluate
      "Program:exit"() {
        if (!importsPlaywright) {
          return;
        }

        // Now require 'hasAction' to avoid False Positives in snippets
        if (hasTest && hasPageUsage && hasAction && !hasErrorListener && firstTestNode) {
          context.report({
            node: firstTestNode.callee,
            messageId: "missingListeners"
          });
        }
      }
    };
  }
};