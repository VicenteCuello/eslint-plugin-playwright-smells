# Playwright Code Smells Catalog

## Low-Level Concerns
These smells affect small code structures, such as the abuse of specific methods or bad syntax, making them ideal candidates for direct detection and autofixing in the IDE.

### Hardcoded Wait (Sleepy Test)
* **Problem:** Halting test execution through explicit time pauses mistakenly assumes a fixed response time. This blocks the event loop, unnecessarily slows down the entire test suite, and is a main cause of flakiness in Continuous Integration (CI) environments because the network or DOM might take longer than the arbitrarily defined time. Developers also use `waitForTimeout` with static mathematical calculations to try to synchronize the script with UI animations (e.g., subtracting milliseconds from a delay). This function is also abused by combining it with boolean variables to manually track the state of network requests.
* **Example:** Forcing a pause with `waitForTimeout` or thread blocks with loops instead of reacting to an event or the DOM state.
    ```javascript
    await page.click("#submit");
    await page.waitForTimeout(2000); // Code smell
    await expect(page.locator(".success")).toBeVisible();
    ```
    > **Another example:** Involves manual network tracking and static pausing.
    ```javascript
    let archiveCalled = false;
    await page.route('**/api/messages/*/archive', async route => { archiveCalled = true; });
    await page.locator('.toolbar-btn').click();
    await page.waitForTimeout(500);
    ```
* **Solution:** Replace static waits with Playwright's "Web-First" assertions that feature native auto-waiting, or use the asynchronous polling mechanism.
    ```javascript
    await page.click("#submit");
    await expect(page.locator(".success")).toBeVisible({ timeout: 10000 });
    ```
    > **Solution to the other example:** For network events, rely on a deterministic wait for the response promise.
    ```javascript
    const archiveResponsePromise = page.waitForResponse(
      resp => resp.url().includes('/archive') && resp.status() === 200
    );
    await page.locator('.toolbar-btn').click();
    await archiveResponsePromise;
    ```

---

### Missing Await (Orphan Promise)
* **Problem:** Omitting the `await` keyword before an asynchronous Playwright assertion causes the test to continue immediately without evaluating the actual promise. This generates false positives (the test passes even if the condition fails) or instability if the execution thread finishes prematurely.
* **Example:** The assertion line evaluates synchronously and never fails.
    ```javascript
    expect(page.getByText("Error")).not.toBeVisible(); // Code smell
    ```
* **Solution:** Ensure that all asynchronous assertions are preceded by the promise resolution.
    ```javascript
    await expect(page.getByText("Error")).toBeHidden();
    ```

---

### Unjustified Forced Action
* **Problem:** Abusing the `{ force: true }` flag in user interactions ignores Playwright's native actionability checks, interacting directly with the DOM. This hides real UI usability issues (like overlapping elements) and masks genuine bugs.
* **Example:** Forcing a click while skipping Playwright's state check.
    ```javascript
    await locator.click({ force: true }); // Code smell
    ```
* **Solution:** Remove the coercion and allow the framework to validate the UI naturally, waiting for the element to reach a stable state.
    ```javascript
    await expect(locator).toBeVisible();
    await locator.click();
    ```

---

### Eager / Non-Web-First Assertion
* **Problem:** Extracting an asynchronous value from the DOM and then using a generic native validator breaks Playwright's auto-retrying mechanism. If the element takes extra milliseconds to transition, the evaluation fails immediately. This also applies to strict URL assertions with dynamic parameters, where an exact URL match (`toHaveURL`) is checked without considering that the Single Page Application (SPA) might append dynamic filters or query parameters asynchronously. Furthermore, bypassing synchronization via `evaluate` to synchronously search for a DOM element completely eludes the auto-wait mechanism. Extracting DOM attributes synchronously via `getAttribute()` instantly breaks Playwright's auto-waiting; if an attribute like `aria-pressed` is read in the exact millisecond a click occurs, the assertion evaluates the old state and fails intermittently.
* **Example:** Evaluating static states or extracting booleans manually, interrupting auto-waiting. Another example is manual synchronous extraction.
    ```javascript
    expect(await page.getByTestId('table').isVisible()).toBe(true); // Code smell 
    expect(page.url()).toEqual('https://app.com/dashboard'); // Code smell
    ```
    > **Another example:** Manual synchronous extraction.
    ```javascript
    const afterPressed = await mute.getAttribute('aria-pressed'); 
    expect(afterPressed).toBe('true');
    ```
* **Solution:** Use web-first assertions (`toHaveURL`, `toBeVisible`), which apply adaptive waiting.
    ```javascript
    await expect(page.getByTestId('table')).toBeVisible();
    await expect(page).toHaveURL('https://app.com/dashboard');
    ```
    > **Solution to the other example:** For attributes, use web-first assertions with auto-waiting.
    ```javascript
    await expect(mute).toHaveAttribute('aria-pressed', 'true');
    ```

---

### Fragile Structural Locators
* **Problem:** Relying on deep DOM structure (complex XPath or CSS) or positional indexes (`.nth()`) makes tests extremely fragile to minor UI modifications. Using global texts without exact selectors leads to Playwright Strict Mode violations by finding ambiguous elements. Developers also abuse indexes (`.nth(0)` or `.first()`) as a quick fix for Strict Mode violations, and omit exact matching in text searches (`{ exact: true }`), leading to false positives if the UI mutates. Another anti-pattern is searching for global texts by scanning the entire `document.body` (Assertion Roulette), generating high false positive rates. "Locator Ambiguity" is also prominent, where generic texts catch multiple overlapping elements (like old toast notifications), breaking Strict Mode.
* **Example:** Tight coupling to the structure or lazy resolutions to strict mode warnings using indexes, text searches without exact limitations, and scanning the whole body instead of targeting a specific locator.
    ```javascript
    await page.locator('div > div:nth-child(3) > button').click(); // Code smell
    await page.locator('button').nth(2).click(); // Code smell
    
    // Lazy solution to a Strict Mode Violation using indexes
    await page.locator('button').nth(2).click();
    
    // Text search without exact matching (will catch "Submit" and "Submit Form")
    await page.getByText('Submit').click();
    
    // Code smell: Scanning the entire body instead of targeting a specific locator
    await page.waitForFunction(() => document.body.textContent.includes('Saved'));
    ```
* **Solution:** Transition to exclusive test-oriented identifiers (`data-testid`) or use resilient semantic filters.
    ```javascript
    await page.getByTestId('submit-button').click();
    await page.locator('tr').filter({ hasText: 'Item 1' }).getByRole('button', { name: /delete/i }).click();
    ```

---

### Legacy ElementHandle Usage
* **Problem:** Using `page.$()` captures a static pointer to a DOM node. If a modern frontend framework (React, Angular) re-renders the component, the pointer breaks, throwing an error that the element is not attached to the DOM.
* **Example:** Storing an obsolete static pointer.
    ```javascript
    const saveButton = await page.$('#save'); // Code smell
    await saveButton.click();
    ```
* **Solution:** Employ dynamic Locators (`page.locator()`) that re-evaluate the DOM in real-time.
    ```javascript
    const saveButton = page.locator('#save');
    await saveButton.click();
    ```

---

### Custom Retry Loops
* **Problem:** Writing `while` loops accompanied by `try/catch` blocks and manual delays (`waitForTimeout`) to retry an action or assertion goes against the framework's design. This clutters the code, is prone to infinite loops, and fails to leverage internal retry mechanisms.
* **Example:** Manually looping and waiting to check a state.
    ```javascript
    let retries = 5;
    while (retries > 0) {
        const state = await page.getByTestId('total').textContent();
        if (parseInt(state, 10) === 100) break;
        retries--;
        await page.waitForTimeout(1000);
    }
    ```
* **Solution:** Rely on modern, native Playwright utilities like `expect.poll` or the `toPass` async block, which handle retries automatically.
    ```javascript
    await expect.poll(async () => {
        const state = await page.getByTestId('total').textContent();
        return parseInt(state, 10);
    }).toBe(100);
    ```

---

### Missing UI Synchronization
* **Problem:** Attempting to interact with elements or make assertions without first verifying if transient loading states (spinners, skeletons, or screen-blocking toasts) exist. Playwright might attempt an interaction while an overlapping element is disappearing, causing intermittent test failures. There are also race conditions with visual transitions (CSS); during native interactions (like Drag and Drop), Playwright's mouse events are faster than CSS transitions. Playwright evaluates static coordinates on a DOM that is still visually shifting, dropping the element in the wrong place.
* **Example:** Assuming the UI reacts instantly without waiting for the loading indicator to disappear.
    ```javascript
    await page.getByRole('button', { name: 'Save' }).click();
    // Code smell: The test assumes the loading was instantaneous
    await expect(page.getByText('Success')).toBeVisible();
    ```
* **Solution:** Assert that blocking elements are hidden before continuing with the next interaction or assertion.
    ```javascript
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByTestId('loading-spinner')).toBeHidden();
    await expect(page.getByText('Success')).toBeVisible();
    ```

---

### Unsynchronized Navigation
* **Problem:** Executing a click event that triggers a navigation but proceeding to the next line of code without using wait blocks (like `waitForNavigation` or `waitForURL`). This results in browser lifecycle errors, as the test attempts to act on a DOM that is being destroyed.
* **Example:**
    ```javascript
    await page.click('a[href="/dashboard"]');
    // Code smell: The test assumes it is immediately on the new page after a click.
    await expect(page.locator('.widget')).toBeVisible();
    ```
* **Solution:** Explicitly validate the URL state change before searching for elements in the new view.
    ```javascript
    await page.click('a[href="/dashboard"]');
    await page.waitForURL('**/dashboard');
    await expect(page.locator('.widget')).toBeVisible();
    ```

---

### Premature Counting (Assertion Without Auto-Wait)
* **Problem:** Fast evaluation methods like `.count()` do not feature auto-waiting in Playwright. If an attempt is made to count elements immediately after an interaction, Playwright evaluates the DOM at that exact millisecond; if the reactive component takes 50ms to appear, the count returns 0 and fails.
* **Example:**
    ```javascript
    await page.getByRole("button", { name: "Send" }).click();
    // Code smell: .count() resolves immediately to 0 if the message hasn't rendered yet
    const messages = await page.getByText("Message sent").count();
    expect(messages).toBe(1);
    ```
* **Solution:** Force synchronization by adding a `toBeVisible()` assertion before counting, or use `toHaveCount()` which does incorporate native auto-waiting.
    ```javascript
    await expect(page.getByText("Message sent")).toHaveCount(1);
    ```

---

### Inappropriate Wait Strategy (Networkidle Usage)
* **Problem:** Using `page.waitForLoadState("networkidle")` to synchronize assertions is an anti-pattern strongly discouraged by Playwright. In modern web applications with telemetry, web sockets, or background polling, the network is rarely completely inactive, causing extreme flakiness. The networkidle state requires at least 500ms of absolute inactivity. In apps that perform constant background polling (e.g., a counter updating every 1 second), inactivity is never reached, generating severe timeouts of up to 40 seconds.
* **Example:** Relying on network inactivity to validate the UI.
    ```javascript
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading")).toBeVisible();
    ```
* **Solution:** Rely on web-first assertions (`toBeVisible`) or directly capture the specific API request fetching the data using `waitForResponse`. If the test must interact in polling environments, create a fixture to intercept and simulate the response instantly to generate the silence window, or avoid networkidle altogether.

---

### Inappropriate Boolean Action
* **Problem:** Using the generic `.click()` method to interact with boolean elements like checkboxes. If the initial state of the checkbox is indeterminate or already checked, the click simply inverts the state to an undesired one, causing instability.
* **Example:** A blind click that doesn't guarantee the final state.
    ```javascript
    await settingsPage.getMetricsCheckbox().click();
    ```
* **Solution:** Use Playwright's semantic and deterministic native methods like `.check()` or `.uncheck()`, which guarantee the final state of the node.
    ```javascript
    await settingsPage.getMetricsCheckbox().check();
    ```

---

### Meaningless UI Assertions
* **Problem:** Making assertions that evaluate the existence of the Playwright object instead of the actual state of the DOM. Validating `expect(page).toBeTruthy()` does not prove that the frontend application has properly rendered the components.
* **Example:** A useless assertion that will always pass if Playwright has started.
    ```javascript
    expect(page).toBeTruthy();
    ```
* **Solution:** Assert the visibility of a root or key DOM element to determine an effective render.
    ```javascript
    await expect(page.locator('#app')).toBeVisible();
    ```

---

### Stale Element Reference
* **Problem:** Saving the reference of a locator that interacts with an element (e.g., in React) that is rebuilt or detached from the DOM during hydration or re-rendering. When attempting to click, the saved element is no longer valid.
* **Example:** Saving and verifying the reference before the click.
    ```javascript
    const graphLink = page.locator('aside a').first();
    if (await graphLink.isVisible().catch(() => false)) {
        await graphLink.click();
    }
    ```
* **Solution:** Inject the selector string directly into the action method so that Playwright searches for the freshest node at that exact moment.
    ```javascript
    const graphSel = 'aside a';
    await page.click(graphSel);
    ```

---

### Context Destruction Race Condition
* **Problem:** Occurs in specific browsers (like WebKit) that quickly destroy and recreate the execution thread when initializing pages. Calling `page.evaluate()` immediately after a navigation throws "Execution context destroyed" errors.
* **Example:**
    ```javascript
    await gotoPage(page, URL);
    // Smell: Executing evaluate right when the page purges the DOM
    const color = await page.evaluate(() => document.documentElement.style.color);
    ```
* **Solution:** Wrap the evaluation in a `toPass()` block, which automatically retries until the environment stabilizes.
    ```javascript
    await expect(async () => {
        const color = await page.evaluate(() => document.documentElement.style.color);
        expect(color).toBe("");
    }).toPass({ timeout: 10_000 });
    ```

---

### Missing Viewport Assertion
* **Problem:** Forcing the screen to scroll to an element (`scrollIntoViewIfNeeded`) and executing an immediate action (`click`) without waiting for the browser to finish painting the scroll. This causes off-screen clicks.
* **Example:**
    ```javascript
    await footnoteRef.scrollIntoViewIfNeeded();
    // Smell: Click executed before confirming the scroll finished
    await footnoteRef.click();
    ```
* **Solution:** Add a strict viewport assertion (`toBeInViewport`) between the scroll event and the click.
    ```javascript
    await footnoteRef.scrollIntoViewIfNeeded();
    await expect(footnoteRef).toBeInViewport();
    await footnoteRef.click();
    ```

---

### Self-Masked Screenshot
* **Problem:** In Visual Regression Testing (VRT), taking a screenshot of an element and applying a mask (`mask`) over that same element, completely nullifying the test's visual validation.
* **Example:** Hiding the exact element that is being evaluated.
    ```javascript
    await expect(modLocator).toHaveScreenshot('name.png', {
        mask: [modLocator],
    });
    ```
* **Solution:** Change the screenshot target to the parent container or replace the screenshot with DOM state assertions.

---

### Hanging Route Interceptions
* **Problem:** When using route handlers (`page.route`), forgetting to execute `route.continue()`, `route.fulfill()`, or `route.abort()` inside conditionals leaves network requests hanging indefinitely. Additionally, using non-deterministic functions like `Date.now()` to mock responses generates variability in every run.
* **Example:**
    ```javascript
    page.route('**/api/messages**', async route => {
        if (condition) {
            await route.fulfill({ body: 'mock' });
            return;
        } 
        // Code smell: Missing the route.continue() for requests that don't meet the condition
    });
    ```
* **Solution:** Ensure all control flows inside `page.route` end in a request resolution and use static data for mocks.
    ```javascript
    page.route('**/api/messages**', async route => {
        if (condition) {
            await route.fulfill({ body: 'mock' });
            return;
        }
        await route.continue();
    });
    ```

---

### Long-Lived Evaluate Blocks
* **Problem:** Injecting a long-running promise (like waiting for a Service Worker to activate) directly into the browser via `page.evaluate()`. If a navigation or reload occurs, Playwright loses the JavaScript context and the test crashes with an "Execution context was destroyed" error.
* **Example:** The script gets trapped in the page context.
    ```javascript
    await page.evaluate(() =>
        navigator.serviceWorker.ready.then(reg => { /* ... */ })
    );
    ```
* **Solution:** Replace the block with `page.waitForFunction()`. This API performs a safe, short polling, and if navigation occurs, Playwright retries the evaluation in the new context without crashing.
    ```javascript
    await page.waitForFunction(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        return reg?.active?.state === 'activated';
    });
    ```

---

## Design-Related Smells
These smells impact test architecture and organization, representing deep synchronization and state issues.

### Global State Leakage
* **Problem:** Initializing classes or mutable data objects directly in the file's global scope. When parallelizing worker execution, tests share or overwrite the memory of those instances, causing state leaks and unpredictable race conditions. This problem happens not only when initializing global variables, but also by making one test depend on data created by a previous test. There is also the issue of network listener leaks (Uncleaned Event Listeners); this occurs when a test subscribes a listener (e.g., to intercept pixels or network requests) and fails to clean the reference upon finishing. This mutated state "leaks" into other parallel tests, breaking them intermittently.
* **Example:** Risky static initialization outside the framework's hooks.
    ```javascript
    const adminUser = new UserClass(); // Code smell
    const mockServer = new MockServer(); // Code smell
    test('scenario 1', async () => { ... });
    ```
    > **Another example:** Making a test fail irreversibly if the preceding one fails.
    ```javascript
    let userId;
    test('create user', async ({ request }) => {
        userId = (await (await request.post('/api/users', { data: { name: 'Test' } })).json()).id;
    });
    
    // Code smell
    test('delete user', async ({ request }) => {
        await request.delete(`/api/users/${userId}`);
    });
    ```
* **Solution:** Delay instantiation to the corresponding lifecycle block (`test.beforeAll` or `test.beforeEach`) or inject dependencies via Fixtures. It's not enough to simply declare global variables; they must be strictly instantiated inside `test.beforeAll` or `test.beforeEach` hooks. Additionally, using imported Singleton objects (like mockServer) breaks Playwright's parallel worker isolation.
    ```javascript
    let adminUser: UserClass;
    test.beforeEach(async () => {
        adminUser = new UserClass();
    });
    ```
    > **For network listener leaks:** Perform cleanup in `test.afterEach`.
    ```javascript
    test.afterEach(() => {
        if (cleanup) { cleanup(); }
    });
    ```

---

### Synchronous Event Race Condition
* **Problem:** Executing an action and belatedly registering a listener for an HTTP response. In fast architectures, the request happens before `waitForResponse` is registered, causing the test to wait forever. Using `Promise.all` can also trigger these desynchronizations if not handled properly. There's also the anti-pattern of using `Promise.all` to combine a click with `waitForResponse`. In fast architectures, the click occurs before Playwright registers the network "listener", leaving the test hanging.
* **Example:** Declaring the wait after the action that triggers it.
    ```javascript
    await page.getByRole('button', { name: 'Load' }).click();
    await page.waitForResponse('/api/data'); // Code smell
    
    // Code smell: Encapsulating the race condition within a Promise.all
    await Promise.all([
        page.waitForResponse((res) => res.request().method() == 'PATCH'),
        page.click('data-testid=SubmitCancelButtons-submitButton'),
    ]);
    ```
* **Solution:** Define the response promise before initiating the DOM interaction, and resolve it afterward.
    ```javascript
    const responsePromise = page.waitForResponse('/api/data');
    await page.getByRole('button', { name: 'Load' }).click();
    await responsePromise;
    ```

---

### UI-based Setup/Teardown
* **Problem:** Preparing the initial state or deleting data by graphically interacting with the UI in setup/teardown blocks (`beforeEach` or `afterAll`). This couples the validations to flows that are not the main goal, making it unnecessarily slow and prone to interruptions by transient UI elements. This doesn't just affect Teardown; forcing a UI-based login in every test drastically slows down the suite. Performing login by graphically filling inputs across multiple test cases also makes pipelines prone to desynchronization. Another setup issue is allowing "first visit" modals to interfere with tests by blocking clicks.
* **Example:** Data deletion cycles via the graphical interface.
    ```javascript
    test.afterAll(async ({ page }) => {
        await page.getByTestId('settings').click();
        await page.getByTestId('delete-user').click(); // Code smell
    });
    ```
* **Solution:** Employ `apiContext` capabilities to clean or prepare resources directly against the backend API, isolating the test from the UI.
    ```javascript
    test.afterAll(async ({ request }) => {
        await request.delete('/api/v1/users/clean');
    });
    ```
    > For UI login scenarios, inject the initial state directly into `localStorage` using `page.addInitScript` or use automatic API calls for login, injecting cookies into the browser context.

---

### Try-Catch / Conditional Flow Control
* **Problem:** Wrapping Playwright UI interactions or assertions inside conditional blocks (`if`) or exception handling (`try/catch`) to evade intermittent states destroys the test's architectural determinism. Automated tests must verify absolute assertions, not hide application instability in silent failure paths. There is also the `isVisible()` Trap: using `await locator.isVisible()` inside a conditional block instantly evaluates the DOM without applying auto-wait. If there's rendering latency, the function returns false prematurely, ignoring Playwright's philosophy.
* **Example:** Using conditionals for silent mitigation.
    ```javascript
    try {
        await expect(editSheet).toBeHidden({ timeout: 15000 })
    } catch {
        await page.keyboard.press('Escape') // Code smell 
    }
    ```
    > **Another example:** Immediate false returns due to rendering latency.
    ```javascript
    // Smell: Immediate false returns due to rendering latency
    if (await target.isVisible()) return target;
    ```
* **Solution:** Clean the forced flow, allowing the natural synchronization of the application code and Playwright to govern determinism.
    ```javascript
    await editSheet.getByRole('button', { name: /update/i }).click();
    await expect(editSheet).toBeHidden();
    ```
    > **Solution to the other example:** Create a helper with a `try/catch` that applies a deterministic `waitFor`.
    ```javascript
    try {
        await target.waitFor({ state: 'visible', timeout: 2500 });
    } catch {
        return false;
    }
    ```

---

### Serial Execution Abuse
* **Problem:** Structuring tests within `test.describe.serial` forces them to run sequentially, depending on the success of the previous one. This couples the suite, destroys determinism, and goes against absolute per-test isolation.
* **Example:** Tying dependent tests together.
    ```javascript
    test.describe.serial('checkout flow', () => {
        test('step 1: add item to cart', async ({ page }) => { ... });
        test('step 2: go to checkout', async ({ page }) => { /* Falla si falla el paso 1 */ });
    });
    ```
* **Solution:** If there's a long critical flow that must be evaluated in sequence within the same state, use logical steps (`test.step`) within a single test, or configure isolated preconditions.
    ```javascript
    test('checkout flow complete', async ({ page }) => {
        await test.step('add item to cart', async () => { ... });
        await test.step('go to checkout', async () => { ... });
    });
    ```

---

### Inline Timeout Overrides
* **Problem:** Locally defining arbitrary timeouts (`{ timeout: 15000 }`) in individual assertions across test files. This fragments configuration, clutters code, and makes it impossible to dynamically scale times when CI servers change performance. There's also Test Timeout Inflation: facing intermittent failures from poor synchronization, developers drastically increase the test's maximum timeout (e.g., `test.setTimeout(90_000)`) as a "patch" to mask failures. Modifying the timeout at the individual test level with massive times breaks project standardization and masks real race conditions.
* **Example:** Hardcoding timeouts line by line.
    ```javascript
    await expect(page.getByRole('heading')).toBeVisible({ timeout: 15000 });
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    ```
* **Solution:** Remove local overrides and centralize time management by increasing the default expect timeout in the global `playwright.config.ts` file. Replace the forced static limit with the native `test.slow()` directive, which semantically indicates that the test is slow and triples the globally configured timeout without hardcoding numbers.

---

### Duplicated Locators (Missing POM)
* **Problem:** Abusing selectors tightly coupled to texts or regular expressions and repeating them throughout the suite. If the UI changes, multiple files will fail simultaneously, violating the DRY (Don't Repeat Yourself) principle.
* **Example:** Magic strings repeated in tests.
    ```javascript
    await page.getByRole("button", { name: /deal cards/i }).click();
    ```
* **Solution:** Implement the Page Object Model (POM) pattern, encapsulating DOM selection within abstract class methods.

---

### Broad Test Skipping
* **Problem:** When facing an intermittent failure (flakiness) in a specific browser, unconditionally deactivating the test using `test.skip()` without conditionals unnecessarily sacrifices test coverage for other stable browsers.
* **Example:** Skipping a test unconditionally.
    ```javascript
    test.skip("test name", async ({ page }) => { ... });
    ```
* **Solution:** Limit the skip by using conditionals provided by project information (e.g., `testInfo.project.name`).
    ```javascript
    test.skip(browserName === "firefox", "Flaky on Firefox");
    ```

---

### Network and Console Blindness
* **Problem:** Running E2E tests that only check the visibility of on-screen elements, completely ignoring if background resources (CSS, JS, WASM) failed with 4xx/5xx network errors or if the DOM throws critical errors in the browser console. This hides partially broken applications.
* **Example:** UI assertions passing successfully even though severe errors like `NotFoundError` are hidden in the console.
* **Solution:** Implement a global listener in the configuration or hooks to catch console or network errors and force an immediate test failure (fail fast).
    ```javascript
    page.on('console', msg => {
        if (msg.type() === 'error' && /NotFoundError/i.test(msg.text())) {
            throw new Error(`Console Error: ${msg.text()}`);
        }
    });
    ```

---

### Resource Leakage
* **Problem:** Upon finishing a test, superficially closing the tab (`newPage.close()`) but failing to destroy the entire application context (e.g., in an Electron app). This saturates memory during long CI runs, causing subsequent tests to fail due to a lack of resources.
* **Example:**
    ```javascript
    test.afterEach(async () => {
        await newPage.close(); // Code smell: The base process remains alive consuming RAM
    });
    ```
* **Solution:** Replace superficial closures with helpers or native methods that fully terminate the parent application process in the `afterAll` or `afterEach` blocks.
