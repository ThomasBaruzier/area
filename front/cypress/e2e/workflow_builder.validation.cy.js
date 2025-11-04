describe("Workflow Builder Validation", () => {
  beforeEach(() => {
    cy.login();
    cy.intercept("GET", "/api/services", { fixture: "services.json" }).as("getServices");
    cy.intercept("GET", "/api/actions/1", { fixture: "actions.json" }).as("getActions");
    cy.intercept("GET", "/api/reactions/2", { fixture: "reactions.json" }).as("getReactions");
    cy.intercept("GET", "/api/user/connections", { body: ["github", "google"] });
    cy.visit("/workflow/create");
  });

  it("should disable the 'Add Action' button after one action has been added", () => {
    cy.get('[data-testid="add-action-button"]').click();
    cy.get('[data-testid="service-picker-modal"]').should("be.visible");
    cy.get('[data-testid="service-select"]').select("GitHub");
    cy.wait("@getActions");
    cy.get('[data-testid="item-select"]').select("Triggers on a new commit");
    cy.get('[data-testid="add-button"]').click();

    cy.get('[data-testid="node-card-New-Commit"]').should("be.visible");
    cy.get('[data-testid="add-action-button"]').should("be.disabled");
  });

  it("should display an error message if saving with an unconnected reaction", () => {
    cy.get('[data-testid="add-action-button"]').click();
    cy.get('[data-testid="service-select"]').select("GitHub");
    cy.wait("@getActions");
    cy.get('[data-testid="item-select"]').select("Triggers on a new commit");
    cy.get('[data-testid="add-button"]').click();

    cy.get('[data-testid="add-reaction-button"]').click();
    cy.get('[data-testid="service-select"]').select("Google");
    cy.wait("@getReactions");
    cy.get('[data-testid="item-select"]').select("Sends an email to a recipient");
    cy.get('[data-testid="add-button"]').click();

    cy.get('[data-testid="node-card-New-Commit"]').click();
    cy.get('[data-testid="node-editor-modal"]').should("be.visible");
    cy.get('[data-testid="node-input-repo"]').type("test/repo");
    cy.get('[data-testid="save-node-button"]').click();

    cy.get('[data-testid="node-card-Send-an-email"]').click();
    cy.get('[data-testid="node-editor-modal"]').should("be.visible");
    cy.get('[data-testid="node-input-to"]').type("test@test.com");
    cy.get('[data-testid="node-input-message"]').type("Hello");
    cy.get('[data-testid="save-node-button"]').click();

    cy.get('[data-testid="save-workflow-button"]').click();

    cy.get('[data-testid="workflow-validation-message"]')
      .should(
        "contain.text",
        'The reaction "Sends an email to a recipient" must be linked from the Action "Triggers on a new commit"',
      )
      .and("be.visible");
  });
});
