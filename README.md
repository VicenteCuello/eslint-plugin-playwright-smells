# eslint-plugin-playwright-smells

An ESLint plugin dedicated to detecting code smells and anti-patterns in automated End-to-End tests using Playwright. It works seamlessly with tests written in both JavaScript and TypeScript.

  

## Prerequisites

Before installing this plugin, ensure you have the following installed in your environment:

-   Node.js (v18 or higher recommended)
-   ESLint (v8.56.0 or higher, with Flat Config support)

  

## Installation

First, install ESLint if you haven't already:

npm install eslint --save-dev

Next, install `eslint-plugin-playwright-smells`:

npm install eslint-plugin-playwright-smells --save-dev

If your Playwright tests are written in TypeScript, you will also need the TypeScript parser to allow ESLint to read `.ts` files correctly. (If your project uses pure JavaScript, you can skip this step):

npm install @typescript-eslint/parser --save-dev

  

## Usage (Flat Config)

This plugin is designed to work seamlessly with ESLint's modern Flat Config system.

In your configuration file (typically `eslint.config.js` or `eslint.config.mjs`), import the plugin. We recommend using the `flat/recommended` configuration, which automatically enables the best practices and rules.

```ts
import playwrightSmells from "eslint-plugin-playwright-smells";
// Only import the parser if you are using TypeScript
import tsParser from "@typescript-eslint/parser"; 

export default [
  // 1. Inject the recommended Plug & Play configuration
  playwrightSmells.configs["flat/recommended"],
  
  // 2. Add the global configuration for the TypeScript parser (Optional for JS-only projects)
  {
    // Explicitly allow ESLint to scan both TypeScript and JavaScript files
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser, // Remove this line if using pure JavaScript
      ecmaVersion: "latest",
      sourceType: "module"
    }
  }
];
```


## Running the Linter

Once configured, you can run ESLint via your terminal to audit your test files.

To scan your repository and see the report, use the extension that matches your language (`.spec.js` or `.spec.ts`):

-   For TypeScript

npx eslint "tests/\*\*/\*.spec.ts"

-   For JavaScript

npx eslint "tests/\*\*/\*.spec.js"

  

## Auto-fixing and Suggestions

This plugin supports ESLint's `--fix` flag. Many safe code smells (like missing `await` keywords) can be automatically resolved by running:

npx eslint "tests/\*\*/\*.spec.ts" --fix

For more complex code smells where the developer's intent is ambiguous (e.g., fragile locators or static timeouts), the plugin provides Suggestions (Quick Fixes). These will not be applied automatically to prevent breaking your tests. Instead, you can trigger them manually via the "lightbulb" icon in your IDE (like VS Code) or via your editor's Code Actions menu.

  

## Configurations

TODO: Run eslint-doc-generator to generate the configs list (or delete this section if no configs are offered).

  

## Rules

TODO: Run eslint-doc-generator to generate the rules list.

