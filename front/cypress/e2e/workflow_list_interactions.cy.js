describe("Workflow List Interactions", () => {
  const mockWorkflow = {
    id: 1,
    toggle: true,
    action: { serviceId: 1, actionId: 1, actionBody: {} },
    reactions: [],
  };

  beforeEach(() => {
    cy.login("interaction_user@test.com", "password123");
    cy.intercept("GET", "/api/workflow/list", { body: [mockWorkflow] }).as("getWorkflows");
    cy.intercept("GET", "/api/services", { fixture: "services.json" }).as("getServices");
    cy.intercept("GET", "/api/actions/*", { body: [] });
    cy.intercept("GET", "/api/reactions/*", { body: [] });
    cy.visit('/');
    cy.visit("/workflow/list");
    cy.wait("@getWorkflows");
  });

  it("should toggle a workflow's state", () => {
    cy.intercept("PATCH", "/api/workflow/edit/1", {
      body: { ...mockWorkflow, toggle: false },
    }).as("updateWorkflow");

    cy.get("[data-testid=toggle-workflow-1]").click();

    cy.wait("@updateWorkflow").its("request.body").should("deep.equal", {
      toggle: false,
    });
    cy.get("[data-testid=toggle-workflow-1]").should("have.attr", "aria-pressed", "false");
    cy.contains(".wf-status", "Inactive").should("be.visible");
  });

  it("should delete a workflow", () => {
    cy.on("window:confirm", () => true);

    cy.intercept("DELETE", "/api/workflow/delete/1", {
      statusCode: 200,
      body: mockWorkflow,
    }).as("deleteWorkflow");

    cy.get("[data-testid=delete-workflow-1]").click();

    cy.wait("@deleteWorkflow");
    cy.get("[data-testid=workflow-card-1]").should("not.exist");
  });
});
