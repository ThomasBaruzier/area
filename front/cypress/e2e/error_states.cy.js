describe("UI Error States", () => {
  beforeEach(() => {
    cy.login("error_user@test.com", "password123");
    cy.visit('/');
  });

  it("should display a friendly error on the workflow list page if the API fails", () => {
    cy.intercept("GET", "/api/workflow/list", {
      statusCode: 500,
      body: { message: "Internal Server Error" },
    }).as("getWorkflowsFail");

    cy.visit("/workflow/list");
    cy.wait("@getWorkflowsFail");
    cy.contains("Internal Server Error").should("be.visible");
  });

  it("should display a friendly error on the services page if the API fails", () => {
    cy.intercept("GET", "/api/services", {
      statusCode: 500,
      body: { message: "Internal Server Error" },
    }).as("getServicesFail");

    cy.visit("/services");
    cy.wait("@getServicesFail");
    cy.contains("Internal Server Error").should("be.visible");
  });
});
