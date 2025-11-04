describe("OAuth Connection Flow", () => {
  beforeEach(() => {
    cy.login();
    cy.intercept("GET", "/api/services", {
      body: [
        {
          id: 1,
          name: "GitHub",
          description: "Code hosting",
          connectUrl: "http://localhost:8080/auth/github",
        },
      ],
    }).as("getServices");
  });

  it("should handle the full OAuth connection and UI update", () => {
    cy.intercept("GET", "/api/user/connections", { body: [] }).as("getConnectionsInitial");
    cy.visit("/services");
    cy.wait("@getServices");
    cy.wait("@getConnectionsInitial");

    cy.get('[data-testid="connect-btn-GitHub"]').should($a => {
      const token = window.localStorage.getItem("token");
      expect(token).to.not.be.null;
      const href = $a.attr('href');
      expect(href).to.include('http://localhost:8080/auth/github');
      expect(href).to.include('origin=web');
      if (token) {
        expect(href).to.include(`token=${token}`);
      }
    });

    cy.intercept("GET", "/api/user/connections", { body: ["github"] }).as("getConnectionsUpdated");

    const fakeJwtPayload = btoa(JSON.stringify({ sub: '123', username: 'oauth-user', email: 'oauth@test.com' }));
    const fakeToken = `fakeHeader.${fakeJwtPayload}.fakeSignature`;

    cy.visit(`/oauth-callback?token=${fakeToken}`);

    cy.url().should("include", "/services");

    cy.wait("@getConnectionsUpdated");

    cy.get('[data-testid="service-card-GitHub"]')
      .find(".connection-badge")
      .should("contain.text", "Connected");
  });
});
