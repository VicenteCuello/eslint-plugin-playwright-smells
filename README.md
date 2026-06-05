# eslint-plugin-playwright-smells

Plugin para la detección de code smells en pruebas automatizadas con Playwright

## Installation

You'll first need to install [ESLint](https://eslint.org/):

```sh
npm i eslint --save-dev
```

Next, install `eslint-plugin-playwright-smells`:

```sh
npm install eslint-plugin-playwright-smells --save-dev
```

## Usage

In your [configuration file](https://eslint.org/docs/latest/use/configure/configuration-files#configuration-file), import the plugin `eslint-plugin-playwright-smells` and add `playwright-smells` to the `plugins` key:

```js
import { defineConfig } from "eslint/config";
import playwright-smells from "eslint-plugin-playwright-smells";

export default defineConfig([
    {
        plugins: {
            playwright-smells
        }
    }
]);
```


Then configure the rules you want to use under the `rules` key.

```js
import { defineConfig } from "eslint/config";
import playwright-smells from "eslint-plugin-playwright-smells";

export default defineConfig([
    {
        plugins: {
            playwright-smells
        },
        rules: {
            "playwright-smells/rule-name": "warn"
        }
    }
]);
```



## Configurations

<!-- begin auto-generated configs list -->
TODO: Run eslint-doc-generator to generate the configs list (or delete this section if no configs are offered).
<!-- end auto-generated configs list -->



## Rules

<!-- begin auto-generated rules list -->
TODO: Run eslint-doc-generator to generate the rules list.
<!-- end auto-generated rules list -->


