describe("Admin Panel", () => {
  it("should not show admin link for regular users and redirect", () => {
    cy.login("regular_user@test.com", "password123");
    cy.visit('/');
    cy.get("nav").should("not.contain", "Users");
    cy.visit("/admin/users", { failOnStatusCode: false });
    cy.url().should("not.include", "/admin/users");
    cy.contains("Welcome to AREA").should("be.visible");
  });

  it("should allow admin to access, edit, promote, and delete users", () => {
    const managedUserEmail = `user.to.manage.${Date.now()}@test.com`;
    cy.request({
      method: "POST",
      url: "/api/user/register",
      body: {
        username: "usertomanage",
        email: managedUserEmail,
        password: "password123",
      },
    });

    cy.login("admin_user@test.com", "password123", true);

    cy.visit('/admin/users');
    cy.contains("h1", "User Management").should("be.visible");

    cy.contains("td", managedUserEmail).parent('tr').as('userRow');
    cy.get('@userRow').invoke('attr', 'data-testid').then(testId => {
      const userId = testId.split('-').pop();

      cy.get(`[data-testid="edit-btn-${userId}"]`).click();
      cy.get(`[data-testid="username-input-${userId}"]`).clear().type("edited_username");
      cy.get(`[data-testid="save-btn-${userId}"]`).click();
      cy.get('@userRow').should("contain", "edited_username");

      cy.get(`[data-testid="promote-btn-${userId}"]`).click();
      cy.get('@userRow').should("contain", "ADMIN");
      cy.get(`[data-testid="promote-btn-${userId}"]`).should('be.disabled');

      cy.on("window:confirm", () => true);
      cy.get(`[data-testid="delete-btn-${userId}"]`).click();
      cy.contains(managedUserEmail).should("not.exist");
    });
  });
});
