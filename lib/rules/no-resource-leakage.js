/**
 * @fileoverview Detects potential resource leaks due to superficial closures in teardown hooks.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Warn about the superficial closure of pages/tabs without closing the parent application in teardown hooks.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#resource-leakage"
    },
    hasSuggestions: false, // The solution requires knowing the parent process name
    messages: {
      resourceLeakage: "Code smell detected: Potential resource leakage. Superficially closing '{{name}}' may leave the main process running in memory. Make sure to close the parent application (e.g., app.close()) or use native Playwright fixtures."
    },
    schema: [],
  },

  create(context) {
    let insideTeardown = false;
    
    // List of common variable names representing superficial layers
    const superficialNodes = ["page", "newpage", "window", "tab", "popup"];

    return {
      CallExpression(node) {
        // Detect if we are entering test.afterEach or test.afterAll
        if (node.callee && node.callee.type === "MemberExpression") {
          const obj = node.callee.object;
          const prop = node.callee.property;
          
          if (obj && obj.name === "test" && prop && (prop.name === "afterEach" || prop.name === "afterAll")) {
            insideTeardown = true;
          }
        }

        // If we are inside teardown, look for calls to .close()
        if (insideTeardown && node.callee && node.callee.type === "MemberExpression") {
          if (node.callee.property.name === "close") {
            const callerNode = node.callee.object;
            
            if (callerNode && callerNode.type === "Identifier") {
              const callerName = callerNode.name.toLowerCase();
              
              // If the variable invoking .close() matches superficial nodes
              if (superficialNodes.some(n => callerName.includes(n))) {
                context.report({
                  node: node.callee.property, // Specifically highlight the ".close"
                  messageId: "resourceLeakage",
                  data: { name: callerNode.name }
                });
              }
            }
          }
        }
      },

      "CallExpression:exit"(node) {
        // Exit the teardown context
        if (node.callee && node.callee.type === "MemberExpression") {
          const obj = node.callee.object;
          const prop = node.callee.property;
          
          if (obj && obj.name === "test" && prop && (prop.name === "afterEach" || prop.name === "afterAll")) {
            insideTeardown = false;
          }
        }
      }
    };
  }
};