// ***********************************************
// Custom Cypress commands
// ***********************************************

// Example usage:
// cy.dataCy('submit-button')

Cypress.Commands.add('dataCy', (value: string) => {
  return cy.get(`[data-cy="${value}"]`);
});

// Type declarations are in cypress/support/index.d.ts
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      dataCy(value: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}
