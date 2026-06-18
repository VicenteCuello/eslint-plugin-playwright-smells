/**
 * @fileoverview Detects network interceptions that do not guarantee a resolution (Hanging Routes).
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Ensure that all control flows within page.route end in a request resolution.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#hanging-route-interceptions"
    },
    fixable: "code",
    messages: {
      hangingRoute: "Code smell detected: Hanging route. The request must be resolved (continue, fulfill, or abort) at the end of the flow. Unhandled requests will cause severe timeouts."
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        // Detect page.route or context.route
        if (node.callee.type === "MemberExpression" && node.callee.property.name === "route") {
          const callback = node.arguments[1];
          if (!callback || (callback.type !== "ArrowFunctionExpression" && callback.type !== "FunctionExpression")) return;

          // Get the parameter name (usually 'route')
          const routeParam = callback.params[0];
          if (!routeParam || routeParam.type !== "Identifier") return;
          const routeName = routeParam.name;

          const body = callback.body;
          if (body.type !== "BlockStatement" || body.body.length === 0) return;

          // Take the last statement of the handler
          const lastStmt = body.body[body.body.length - 1];

          // Recursive Control Flow Analysis function
          function isResolution(stmt) {
            if (!stmt) return false;
            
            if (stmt.type === "BlockStatement") {
              if (stmt.body.length === 0) return false;
              return isResolution(stmt.body[stmt.body.length - 1]);
            }
            
            // Case 1: Direct expression (e.g., await route.continue();)
            if (stmt.type === "ExpressionStatement") {
              let expr = stmt.expression;
              if (expr.type === "AwaitExpression") expr = expr.argument;
              if (expr.type === "CallExpression" && expr.callee.type === "MemberExpression") {
                if (expr.callee.object.name === routeName) {
                  return ["continue", "fulfill", "abort", "fallback"].includes(expr.callee.property.name);
                }
              }
            }
            
            // Case 2: Explicit return (e.g., return route.abort();)
            if (stmt.type === "ReturnStatement") {
              if (!stmt.argument) return false;
              let arg = stmt.argument;
              if (arg.type === "AwaitExpression") arg = arg.argument;
              if (arg.type === "CallExpression" && arg.callee.type === "MemberExpression") {
                if (arg.callee.object.name === routeName) {
                  return ["continue", "fulfill", "abort", "fallback"].includes(arg.callee.property.name);
                }
              }
            }
            
            // Case 3: Branching (if/else). Both paths MUST resolve.
            if (stmt.type === "IfStatement") {
              return isResolution(stmt.consequent) && stmt.alternate && isResolution(stmt.alternate);
            }
            
            return false;
          }

          // If the final block does not guarantee resolution, report the smell
          if (!isResolution(lastStmt)) {
            context.report({
              node: lastStmt, // Highlight the block causing the problem (e.g., the If)
              messageId: "hangingRoute",
              fix: function(fixer) {
                // Inject continue as a fallback at the end dynamically using the parameter name
                return fixer.insertTextAfter(lastStmt, `\n  await ${routeName}.continue();`);
              }
            });
          }
        }
      }
    };
  }
};