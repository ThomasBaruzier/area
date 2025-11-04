describe("Workflow Editing", () => {
  const mockWorkflow = {
    id: "123",
    toggle: true,
    action: {
      serviceId: 1,
      actionId: 1,
      actionBody: { repo: "initial/repo" },
    },
    reactions: [
      {
        serviceId: 2,
        reactionId: 1,
        reactionBody: { to: "initial@test.com", message: "Initial message" },
      },
    ],
  };

  beforeEach(() => {
    cy.login("edit_user@test.com", "password123");
    cy.intercept("GET", "/api/workflow/list", { body: [mockWorkflow] }).as("getWorkflows");
    cy.intercept("GET", "/api/services", { fixture: "services.json" }).as("getServices");
    cy.intercept("GET", "/api/actions/1", { fixture: "actions.json" }).as("getActions");
    cy.intercept("GET", "/api/reactions/2", { fixture: "reactions.json" }).as("getReactions");
    cy.intercept("PATCH", `/api/workflow/edit/${mockWorkflow.id}`, {
      statusCode: 200,
      body: { ...mockWorkflow, id: "123" },
    }).as("updateWorkflow");

    cy.visit('/');
  });

  it("should load an existing workflow and allow editing and saving", () => {
    cy.visit("/workflow/list");
    cy.wait("@getWorkflows");

    cy.get(`[data-testid=workflow-card-${mockWorkflow.id}]`).contains("button", "Edit").click();

    cy.url().should("include", `/workflow/edit/${mockWorkflow.id}`);

    cy.get('[data-testid="node-card-New-Commit"]').should("be.visible");
    cy.get('[data-testid="node-card-Send-an-email"]').should("be.visible");

    cy.get('[data-testid="node-card-New-Commit"]').click();
    cy.get('[data-testid="node-editor-modal"]').should("be.visible");
    cy.get('[data-testid="node-editor-modal"]').contains("h2", "Edit: Triggers on a new commit").should("be.visible");
    cy.get('[data-testid="node-input-repo"]').should("have.value", "initial/repo");
    cy.get('[data-testid="node-input-repo"]').clear().type("updated/repo");
    cy.get('[data-testid="save-node-button"]').click();
    cy.get('[data-testid="node-editor-modal"]').should("not.exist");

    cy.get('[data-testid="save-workflow-button"]').click();

    cy.wait("@updateWorkflow").its("request.body.action.actionBody.repo").should("eq", "updated/repo");
    cy.url().should("include", "/workflow/list");
  });
});
