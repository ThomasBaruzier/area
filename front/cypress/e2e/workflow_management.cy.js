describe("Workflow Management", () => {
  it('should display an empty list and allow navigation to the create page', () => {
    cy.login(`test-user-${Date.now()}@example.com`);
    cy.intercept('GET', '/api/services', { fixture: 'services.json' }).as('getServices');
    cy.intercept('GET', '/api/workflow/list', { body: [] }).as('getWorkflows');
    cy.intercept('GET', '/api/user/connections', { body: [] });

    cy.visit('/');
    cy.wait('@getServices');

    cy.contains('View my Workflows').click();
    cy.url().should('include', '/workflow/list');
    cy.wait('@getWorkflows');

    cy.contains('h1', 'Workflows').should('be.visible');
    cy.contains('No workflows yet.').should('be.visible');
    cy.get('[data-testid=create-workflow-button]').should('be.visible').click();
    cy.url().should('include', '/workflow/create');
  });

  it('should display a workflow', () => {
    cy.login(`test-user-${Date.now()}@example.com`);
    const mockWorkflow = {
      id: 1,
      toggle: true,
      action: {
        serviceId: 1,
        actionId: 1,
        actionBody: { repo: 'test/repo' },
      },
      reactions: [
        {
          serviceId: 2,
          reactionId: 1,
          reactionBody: { to: 'dest@mail.com' },
        },
      ],
    };

    cy.intercept('GET', '/api/services', { fixture: 'services.json' }).as('getServices');
    cy.intercept('GET', '/api/workflow/list', { body: [mockWorkflow] }).as('getWorkflows');
    cy.intercept('GET', '/api/actions/1', { fixture: 'actions.json' }).as('getGithubActions');
    cy.intercept('GET', '/api/reactions/1', { body: [] }).as('getGithubReactions');
    cy.intercept('GET', '/api/actions/2', { body: [] }).as('getGoogleActions');
    cy.intercept('GET', '/api/reactions/2', { fixture: 'reactions.json' }).as('getGoogleReactions');
    cy.intercept('GET', '/api/user/connections', { body: [] });

    cy.visit('/');
    cy.wait('@getServices');

    cy.contains('View my Workflows').click();
    cy.url().should('include', '/workflow/list');

    cy.wait('@getWorkflows');
    cy.wait('@getGithubActions');
    cy.wait('@getGoogleReactions');

    cy.get('[data-testid=workflow-card-1]', { timeout: 10000 }).should('be.visible');
  });
});
