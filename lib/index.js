/**
 * @fileoverview Plugin for detecting code smells in automated tests with Playwright
 * @author Vicente Cuello
 */
"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const requireIndex = require("requireindex");

//------------------------------------------------------------------------------
// Plugin Definition
//------------------------------------------------------------------------------

// Automatically import all JS files from the /rules folder
const rules = requireIndex(__dirname + "/rules");

module.exports = {
  // 1. Export the rules so ESLint knows they exist
  rules,

  // 2. Define the "recommended" configuration for the plugin
  configs: {
    recommended: {
      plugins: ["playwright-smells"],
      rules: {
        // --- Low-Level Concerns (Syntax and API) ---
        "playwright-smells/no-hardcoded-wait": "error",
        "playwright-smells/missing-await": "error",
        "playwright-smells/no-unjustified-force": "error",
        "playwright-smells/prefer-web-first-assertions": "error",
        "playwright-smells/no-fragile-locators": "error",
        "playwright-smells/no-element-handle": "error",
        "playwright-smells/no-custom-retry-loop": "error",
        "playwright-smells/prefer-native-ui-sync": "error",
        "playwright-smells/no-redundant-navigation-wait": "error",
        "playwright-smells/no-premature-counting": "error",
        "playwright-smells/no-networkidle": "error",
        "playwright-smells/no-inappropriate-boolean-action": "error",
        "playwright-smells/no-meaningless-assertions": "error",
        "playwright-smells/no-conditional-ui": "error",
        "playwright-smells/no-context-destruction-race": "error",
        "playwright-smells/no-redundant-scroll": "error",
        "playwright-smells/no-self-masked-screenshot": "error",
        "playwright-smells/no-hanging-route": "error",
        "playwright-smells/no-long-lived-evaluate": "error",

        // --- Design-Related Smells (Architecture and State) ---
        "playwright-smells/no-global-state-leakage": "error",
        "playwright-smells/no-sequential-event-listener": "error",
        "playwright-smells/no-ui-setup-teardown": "error",
        "playwright-smells/no-conditional-flow-control": "error",
        "playwright-smells/no-serial-execution": "error",
        "playwright-smells/no-inline-timeout": "error",
        "playwright-smells/no-broad-test-skipping": "error",
        "playwright-smells/require-error-listeners": "error",
        "playwright-smells/no-resource-leakage": "error"
      }
    }
  }
};