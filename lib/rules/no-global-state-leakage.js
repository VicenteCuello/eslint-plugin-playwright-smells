/**
 * @fileoverview Detects global state leakage: static instantiations and inter-test dependencies.
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Prevent object initialization in the global scope and state mutation between tests to protect parallel execution.",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/VicenteCuello/eslint-plugin-playwright-smells/blob/main/docs/Playwright_Code_Smells_Catalog.md#global-state-leakage"
    },
    hasSuggestions: false, // Architectural solution (requires moving code to beforeEach or using Fixtures)
    messages: {
      globalInstantiation: "Code smell detected: Global instantiation (new {{name}}). Initializing objects outside of hooks breaks the isolation of parallel workers.",
      interTestDependency: "Code smell detected: Inter-test state leakage. Mutating the global variable '{{name}}' inside a test generates execution order dependencies."
    },
    schema: [],
  },

  create(context) {
    // Store the variables declared at the root of the file
    const rootVariables = new Set();
    let testBlockDepth = 0;

    return {
      Program(node) {
        // Scan the root of the document looking for variables
        node.body.forEach(stmt => {
          if (stmt.type === "VariableDeclaration") {
            stmt.declarations.forEach(decl => {
              if (decl.id.type === "Identifier") {
                rootVariables.add(decl.id.name);

                // Heuristic 1: Is the variable born by instantiating a class immediately?
                if (decl.init && decl.init.type === "NewExpression") {
                  const className = decl.init.callee.name || "Object";
                  context.report({
                    node: decl.init,
                    messageId: "globalInstantiation",
                    data: { name: className }
                  });
                }
              }
            });
          }
        });
      },

      // Track when we enter and exit a test() block
      CallExpression(node) {
        // Detects 'test(...)'. Ignores 'test.beforeEach(...)' because it is a MemberExpression
        if (node.callee.type === "Identifier" && node.callee.name === "test") {
          testBlockDepth++;
        }
      },
      "CallExpression:exit"(node) {
        if (node.callee.type === "Identifier" && node.callee.name === "test") {
          testBlockDepth--;
        }
      },

      // Heuristic 2: Mutation of global variables inside the test
      AssignmentExpression(node) {
        if (testBlockDepth > 0 && node.left.type === "Identifier") {
          if (rootVariables.has(node.left.name)) {
            context.report({
              node: node.left,
              messageId: "interTestDependency",
              data: { name: node.left.name }
            });
          }
        }
      }
    };
  }
};