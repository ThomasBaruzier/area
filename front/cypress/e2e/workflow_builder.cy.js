describe("Visual Workflow Builder", () => {
  beforeEach(() => {
    cy.login("builder_user@test.com", "password123");
    cy.intercept("GET", "/api/services", { fixture: "services.json" }).as("getServices");
    cy.intercept("GET", "/api/actions/1", { fixture: "actions.json" }).as("getGithubActions");
    cy.intercept("GET", "/api/reactions/2", { fixture: "reactions.json" }).as("getGoogleReactions");
    cy.intercept("GET", "/api/user/connections", { body: ["github", "google"] });
    cy.visit('/');
  });

  it("should allow a user to visually create, configure, and save a workflow", () => {
    const mockCreatedWorkflow = {
      id: 1,
      toggle: true,
      action: {
        actionId: 1,
        serviceId: 1,
        actionBody: { repo: "my-user/my-repo" },
      },
      reactions: [
        {
          reactionId: 1,
          serviceId: 2,
          reactionBody: { to: "test@example.com", message: "Hello from AREA!" },
        },
      ],
    };
    cy.intercept("POST", "/api/workflow/create", { statusCode: 201, body: mockCreatedWorkflow }).as("createWorkflow");
    cy.visit("/workflow/create");

    cy.get('[data-testid="add-action-button"]').click();
    cy.get('[data-testid="service-picker-modal"]').should("be.visible");
    cy.get('[data-testid="service-select"]').select("GitHub");
    cy.wait("@getGithubActions");
    cy.get('[data-testid="item-select"]').select("Triggers on a new commit");
    cy.get('[data-testid="add-button"]').click();

    cy.get('[data-testid="add-reaction-button"]').click();
    cy.get('[data-testid="item-select"]').should('be.disabled');
    cy.get('[data-testid="service-select"]').select("Google");
    cy.wait("@getGoogleReactions");
    cy.get('[data-testid="item-select"]').select("Sends an email to a recipient");
    cy.get('[data-testid="add-button"]').click();

    cy.get('[data-testid="node-card-New-Commit"]')
      .find('[data-handlepos="right"]')
      .first()
      .click({ force: true });

    cy.get('[data-testid="node-card-Send-an-email"]')
      .find('[data-handlepos="left"]')
      .first()
      .click({ force: true });

    cy.get('[data-testid="node-card-New-Commit"]').click();
    cy.get('[data-testid="node-editor-modal"]').should("be.visible").contains("h2", "Edit: Triggers on a new commit");
    cy.get('[data-testid="node-input-repo"]').type("my-user/my-repo");
    cy.get('[data-testid="save-node-button"]').click();

    cy.get('[data-testid="node-card-Send-an-email"]').click();
    cy.get('[data-testid="node-editor-modal"]').should("be.visible").contains("h2", "Edit: Sends an email to a recipient");
    cy.get('[data-testid="node-input-to"]').type("test@example.com");
    cy.get('[data-testid="node-input-message"]').type("Hello from AREA!");
    cy.get('[data-testid="save-node-button"]').click();

    cy.get('[data-testid="save-workflow-button"]').click();

    cy.wait("@createWorkflow");
    cy.url().should("include", "/workflow/list");
  });

  it("should validate workflow before saving", () => {
    cy.visit("/workflow/create");
    cy.get('[data-testid="add-action-button"]').click();
    cy.get('[data-testid="service-select"]').select("GitHub");
    cy.wait("@getGithubActions");
    cy.get('[data-testid="item-select"]').select("Triggers on a new commit");
    cy.get('[data-testid="add-button"]').click();

    cy.get('[data-testid="add-action-button"]').should("be.disabled");

    cy.get('[data-testid="add-reaction-button"]').click();
    cy.get('[data-testid="service-select"]').select("Google");
    cy.wait("@getGoogleReactions");
    cy.get('[data-testid="item-select"]').select("Sends an email to a recipient");
    cy.get('[data-testid="add-button"]').click();

    cy.get('[data-testid="save-workflow-button"]').click();
    cy.get('[data-testid="workflow-validation-message"]').should("contain.text", 'The field "repo" of node "Triggers on a new commit" is empty.');

    cy.get('[data-testid="node-card-New-Commit"]').click();
    cy.get('[data-testid="node-input-repo"]').type("my-user/my-repo");
    cy.get('[data-testid="save-node-button"]').click();
    cy.get('[data-testid="node-card-Send-an-email"]').click();
    cy.get('[data-testid="node-input-to"]').type("test@example.com");
    cy.get('[data-testid="node-input-message"]').type("Hello from AREA!");
    cy.get('[data-testid="save-node-button"]').click();

    cy.get('[data-testid="save-workflow-button"]').click();
    cy.get('[data-testid="workflow-validation-message"]').should("contain.text", 'The reaction "Sends an email to a recipient" must be linked from the Action "Triggers on a new commit".');
  });
});
