/**
 * @fileoverview Forbids the use of manual mouse events to prevent UI desynchronization.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Avoid using page.mouse to prevent race conditions with CSS animations.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#missing-ui-synchronization"
    },
    hasSuggestions: true,
    messages: {
      manualMouseSync: "Code smell detected: Missing UI Synchronization. Manual page.mouse events ignore native CSS animation waits (Actionability).",
      replaceWithDragTo: "Suggestion: Use locator.dragTo() for drag operations with auto-wait",
      replaceWithHover: "Suggestion: Use locator.hover() for simple movements"
    },
    schema: [],
  },

  create(context) {
    // Get the path and name of the current file
    const filename = context.getFilename ? context.getFilename() : context.filename;

    // Define a heuristic based on keywords to detect graphical environments
    // (E.g.: testing-camera-movement.spec.ts, canvas-render.spec.ts, webgl-scene.spec.ts)
    const isGraphicsDomain = /canvas|webgl|camera|scene|3d|graphical|game|orbit|constraints|sketch/i.test(filename || "");

    // If we detect it is a graphics domain, turn off the rule for this file
    if (isGraphicsDomain) {
      return {}; 
    }    

    return {
      CallExpression(node) {
        if (node.callee && node.callee.type === "MemberExpression") {
          // Check if the called object belongs to "mouse" (e.g., page.mouse.move)
          const isMouseAPI = node.callee.object && 
                             node.callee.object.type === "MemberExpression" && 
                             node.callee.object.property.name === "mouse";

          if (isMouseAPI) {
            const action = node.callee.property.name;
            
            // Penalize low-level methods
            if (["move", "down", "up"].includes(action)) {
              context.report({
                node: node.callee.property,
                messageId: "manualMouseSync",
                suggest: [
                  {
                    messageId: "replaceWithDragTo",
                    fix: fixer => fixer.replaceText(node.parent, "await page.locator('YOUR_SOURCE').dragTo(page.locator('YOUR_DESTINATION'))")
                  },
                  {
                    messageId: "replaceWithHover",
                    fix: fixer => fixer.replaceText(node.parent, "await page.locator('YOUR_ELEMENT').hover()")
                  }
                ]
              });
            }
          }
        }
      }
    };
  }
};