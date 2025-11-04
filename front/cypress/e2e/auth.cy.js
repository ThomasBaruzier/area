describe("Authentication", () => {
  it("should allow a user to register and log in", () => {
    const email = `test_user_${Date.now()}@test.com`;
    const password = "password123";

    cy.visit("/register");
    cy.get('input[data-testid="username-input"]').type(email.split("@")[0]);
    cy.get('input[data-testid="email-input"]').type(email);
    cy.get('input[data-testid="password-input"]').type(password);
    cy.get('button[data-testid="submit-button"]').click();

    cy.url().should("include", "/");
    cy.contains("View my Workflows").should("be.visible");
  });

  it("should show an error for invalid login credentials", () => {
    cy.visit("/login");
    cy.get('input[data-testid="email-input"]').type("wrong@test.com");
    cy.get('input[data-testid="password-input"]').type("wrongpassword");
    cy.get('button[data-testid="submit-button"]').click();

    cy.contains("Invalid credentials").should("be.visible");
  });

  it("should redirect unauthenticated users from protected routes", () => {
    cy.visit("/workflow/list");
    cy.url().should("include", "/login");
  });

  it("should allow a user to log out", () => {
    cy.login();
    cy.visit('/');

    cy.get('[data-testid="user-avatar-button"]').click();
    cy.get('[data-testid="logout-button"]').click();

    cy.url().should('include', '/login');
    cy.window().its('localStorage').invoke('getItem', 'token').should('be.null');
  });
});
