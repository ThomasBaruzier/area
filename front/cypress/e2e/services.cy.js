describe("Services Page", () => {
  beforeEach(() => {
    cy.login("services_user@test.com", "password123");
    cy.intercept("GET", "/api/services", { fixture: "services.json" }).as("getServices");
    cy.intercept("GET", "/api/actions/1", { fixture: "actions.json" }).as("getActions");
    cy.intercept("GET", "/api/reactions/1", { body: [] }).as("getReactions");
    cy.intercept("GET", "/api/user/connections", { body: ["github"] });
    cy.visit('/services');
    cy.wait('@getServices');
  });

  it("should display a list of services with their connection status", () => {
    cy.get('[data-testid="service-card-GitHub"]').within(() => {
      cy.contains("Connected").should("be.visible");
      cy.get('a').contains("Reconnect").should("be.visible");
    });

    cy.get('[data-testid="service-card-Google"]').within(() => {
      cy.contains("Disconnected").should("be.visible");
      cy.get('a').contains("Connect").should("be.visible");
    });
  });

  it("should open a details modal when a service card is clicked", () => {
    cy.get('[data-testid="service-card-GitHub"]').click();

    cy.get('[data-testid="service-details-modal"]').should("be.visible");
    cy.wait('@getActions');
    cy.wait('@getReactions');

    cy.get('[data-testid="service-details-modal"]').within(() => {
      cy.contains("h2", "GitHub").should("be.visible");
      cy.contains("Actions").should("be.visible");
      cy.contains("New Commit").should("be.visible");
      cy.contains("Reactions").should("be.visible");
    });

    cy.get('[aria-label="Close"]').click();
    cy.get('[data-testid="service-details-modal"]').should("not.exist");
  });

  it("should have correct href for OAuth flow when 'Connect' is clicked", () => {
    cy.get('[data-testid="connect-btn-Google"]')
      .should('have.attr', 'href')
      .and('include', '/auth/google')
      .and('include', 'origin=web')
      .and('include', 'token=');
  });
});
