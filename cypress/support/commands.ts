// ***********************************************
// Custom Cypress commands
// Type declarations live in cypress/support/index.d.ts
// ***********************************************

// Example usage:
// cy.dataCy('submit-button')

Cypress.Commands.add('dataCy', (value: string) => {
  return cy.get(`[data-cy="${value}"]`);
});
