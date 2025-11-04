Cypress.Commands.add(
  "login",
  (email = "session-user@example.com", password = "password123", isAdmin = false) => {
    cy.session(
      [email, isAdmin],
      () => {
        cy.request({
          method: "POST",
          url: "/api/user/register",
          body: {
            username: email.split("@")[0],
            email,
            password,
          },
          failOnStatusCode: false,
        }).then(() => {
          if (isAdmin) {
            cy.task("db:promote", email).then((user) => {
              expect(user, `Promoting ${email} to ADMIN`).to.not.be.null;
              if (user) {
                expect(user.role).to.eq('ADMIN');
              }
            });
          }
        });

        cy.request("POST", "/api/user/login", { email, password }).then(
          (response) => {
            const token = response.body.access_token;
            const userFromApi = response.body.user;
            const user = JSON.stringify({
              ...userFromApi,
              id: String(userFromApi.id),
            });

            cy.visit('/', {
              onBeforeLoad(win) {
                win.localStorage.setItem('token', token);
                win.localStorage.setItem('user', user);
              },
            });
          }
        );
      },
      {
        cacheAcrossSpecs: true,
        validate() {
          cy.window().its('localStorage').invoke('getItem', 'token').then(token => {
            expect(token).to.be.a('string');
            cy.request({
              url: '/api/user/connections',
              headers: {
                Authorization: `Bearer ${token}`
              },
              failOnStatusCode: false
            }).its('status').should('eq', 200);
          });
        },
      }
    );
  }
);
