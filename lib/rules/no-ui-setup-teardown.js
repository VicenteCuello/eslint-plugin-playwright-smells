/**
 * @fileoverview Detects and forbids the use of UI interactions within setup and teardown hooks.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Avoid UI interactions (click, fill, etc.) in before/after hooks. Use APIRequestContext instead.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#ui-based-setupteardown"
    },
    hasSuggestions: false, 
    messages: {
      uiInHook: "Code smell detected: UI-based configuration. You have used '{{action}}' inside a '{{hook}}' hook. Replace graphical manipulation with direct API calls (request) or state injection to improve speed and stability."
    },
    schema: [],
  },

  create(context) {
    const HOOKS = ["beforeAll", "beforeEach", "afterAll", "afterEach"];
    const UI_ACTIONS = ["click", "fill", "check", "uncheck", "type", "press", "dblclick", "hover", "selectOption", "tap", "dragTo"];
    
    let hookDepth = 0;
    let currentHook = "";

    return {
      CallExpression(node) {
        if (node.callee && node.callee.type === "MemberExpression") {
          const obj = node.callee.object;
          const prop = node.callee.property;

          // Detect if we are entering a hook (test.beforeAll, test.afterEach, etc.)
          if (obj && obj.name === "test" && prop && HOOKS.includes(prop.name)) {
            hookDepth++;
            currentHook = prop.name;
          }

          // If we are inside a hook and detect a UI interaction verb, report it
          if (hookDepth > 0 && prop && UI_ACTIONS.includes(prop.name)) {
            
            // If the object calling the method is a simple identifier (a variable)
            if (obj && obj.type === "Identifier") {
              // List of common callback variables that are NOT UI-related
              const excludedObjects = [
                "msg", "message", "console", "request", "response", 
                "error", "err", "e", "event"
              ];
              
              if (excludedObjects.includes(obj.name)) {
                return;
              }
            }

            context.report({
              node: prop, // Highlight the exact verb (e.g., click)
              messageId: "uiInHook",
              data: { 
                action: prop.name,
                hook: currentHook
              }
            });
          }
        }
      },
      "CallExpression:exit"(node) {
        // Decrease depth when exiting the hook
        if (node.callee && node.callee.type === "MemberExpression") {
          const obj = node.callee.object;
          const prop = node.callee.property;
          if (obj && obj.name === "test" && prop && HOOKS.includes(prop.name)) {
            hookDepth--;
          }
        }
      }
    };
  }
};