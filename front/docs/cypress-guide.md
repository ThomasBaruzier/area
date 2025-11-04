# Cypress e2e testing guide

This guide provides best practices for writing stable, reliable, and maintainable end-to-end tests for this project using Cypress. Following these principles will help avoid common pitfalls and ensure our test suite remains a valuable asset.

## 1. Mastering session management with `cy.session`

The `cy.session` command is a powerful tool for speeding up tests by caching login states. However, its interaction with a client-side application like React can be subtle and lead to confusing failures.

### The `localStorage` contract

A common failure mode is a `cy.session` validation error that appears to be an authentication token issue. The root cause is often a mismatch between the data the test places in `localStorage` and what the React application's `AuthProvider` expects.

A race condition can occur between the Cypress setup function and the application's startup logic:
1.  The `cy.login` command's setup function runs, populating `localStorage` with a `token` and a `user` object.
2.  `cy.visit('/')` is called, and the React application begins to load.
3.  The `AuthProvider` immediately reads `localStorage` to restore the session.
4.  If the `user` object's data types do not match what `AuthProvider` expects (e.g., `user.id` is a `number` instead of a `string`), the provider considers the session invalid and clears `localStorage`.
5.  Finally, the `cy.session` `validate` function runs, but by this point, the token has already been deleted by the application, causing the test to fail.

### How to write a reliable `cy.login` command

To avoid this, you must treat `localStorage` as a strict contract. The data you set must be identical in structure and type to what the application itself would set.

#### A robust `cy.login` implementation

Notice the explicit `String()` conversion for the user ID. This ensures the `user` object stored in `localStorage` perfectly matches the format our `AuthProvider` expects, preventing it from invalidating the session.

```javascript
Cypress.Commands.add(
  "login",
  (email = "session-user@example.com", password = "password123", isAdmin = false) => {
    cy.session(
      [email, isAdmin],
      () => {
        // Register user if they don't exist
        cy.request({
          method: "POST",
          url: "/api/user/register",
          body: {
            username: email.split("@"),
            email,
            password,
          },
          failOnStatusCode: false,
        }).then(() => {
          if (isAdmin) {
            cy.task("db:promote", email);
          }
        });

        // Log in to get the token
        cy.request("POST", "/api/user/login", { email, password }).then(
          (response) => {
            const token = response.body.access_token;
            const userFromApi = response.body.user;

            // This is the critical part.
            // The frontend expects the user ID to be a string in localStorage.
            const user = JSON.stringify({
              ...userFromApi,
              id: String(userFromApi.id),
            });

            // Set localStorage before visiting the page
            cy.visit('/');
            cy.window().then((win) => {
              win.localStorage.setItem('token', token);
              win.localStorage.setItem('user', user);
            });
          }
        );
      },
      {
        cacheAcrossSpecs: true,
        validate() {
          // Validate that the token is still in localStorage and is valid
          cy.window().its('localStorage').invoke('getItem', 'token').then(token => {
            expect(token).to.be.a('string');
            cy.request({
              url: '/api/user/connections',
              headers: {
                Authorization: `Bearer ${token}`
              },
              failOnStatusCode: false
            }).its('status').should('eq', 200);
          });
        },
      }
    );
  }
);
```

## 2. Writing stable selectors

Tests that rely on CSS classes, element types, or text content are brittle. They break whenever a developer refactors styles or changes text, even if the application's behavior remains correct.

### The `data-testid` imperative

The most robust way to select elements is by using a dedicated `data-testid` attribute. This creates a stable testing hook that is completely decoupled from styling and content.

### Selector priority list

When writing tests, choose your selectors in the following order of preference:

1.  `cy.get('[data-testid="..."]')`: The most robust and preferred method. Add these attributes to your components as you develop them.
2.  `cy.get('[role="..."]')`: Good for accessibility and generally stable for elements with clear roles like `button`, `dialog`, or `navigation`.
3.  `cy.contains('Text')`: Useful for asserting that text exists. It can be ambiguous if the text appears multiple times. Always try to scope it within a `data-testid` container, like `cy.get('[data-testid="modal"]').contains('Save')`.
4.  CSS classes or element types: Use these only as a last resort.

## 3. Handling asynchronicity

E2E tests must account for the asynchronous nature of web applications, especially network requests and UI updates.

### Intercept network requests

Never use arbitrary waits like `cy.wait(1000)`. Instead, use `cy.intercept()` to create an alias for your network requests. This allows your test to explicitly wait for the application to finish fetching data before proceeding.

```javascript
// In your test setup
cy.intercept("POST", "/api/workflow/create").as("createWorkflow");

// In your test body
cy.get('[data-testid="save-workflow-button"]').click();
cy.wait("@createWorkflow"); // The test pauses here until the API call completes.
cy.url().should("include", "/workflow/list");
```

### Use assertions as implicit waits

Cypress automatically retries assertions for a default timeout period. This is the correct way to wait for the UI to update after an action.

#### Correct approach

```javascript
cy.get('[data-testid="submit-button"]').click();
// Cypress will retry this assertion until the element appears or it times out.
cy.get('[data-testid="error-message"]').should('be.visible');
```

#### Anti-pattern

```javascript
cy.get('[data-testid="submit-button"]').click();
cy.wait(500); // This is a fragile guess. The test might fail on a slow connection.
cy.get('[data-testid="error-message"]').should('be.visible');
```

## 4. Aligning tests with the user journey

An end-to-end test should simulate a real user's interaction flow. A test's logic must mirror the application's logic, including the order of validation.

For example, in the workflow builder, if the application first validates that all required fields are filled and only then checks if all nodes are correctly linked, the test must follow this exact sequence.

### Testing validation step-by-step

1.  Attempt the final action with an invalid state (e.g., click "save" with empty fields).
2.  Assert that the first expected validation message appears.
3.  Correct the first error (e.g., fill in the fields).
4.  Attempt the final action again.
5.  Assert that the second expected validation message appears (e.g., for unlinked nodes).

This approach ensures your test is verifying the actual user experience and validation flow, making it much more meaningful.
