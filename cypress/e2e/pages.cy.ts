/**
 * Page-level smoke tests — verify pages load and key elements are present.
 * These run against a live Next.js dev/prod server on localhost:3000.
 */

describe('Home page', () => {
  it('loads successfully', () => {
    cy.visit('/');
    cy.get('body').should('be.visible');
  });

  it('contains navigation links', () => {
    cy.visit('/');
    cy.get('nav').should('exist');
    cy.get('nav').contains('Games').should('exist');
    cy.get('nav').contains('Tools').should('exist');
  });
});

describe('Games page', () => {
  it('loads the /games route', () => {
    cy.visit('/games');
    cy.get('body').should('be.visible');
  });

  it('shows links to individual games', () => {
    cy.visit('/games');
    cy.contains('Tic Tac Toe').should('exist');
    cy.contains('Car Shot').should('exist');
    cy.contains('Dancing Crab').should('exist');
  });
});

describe('Tools page', () => {
  it('loads the /tools route', () => {
    cy.visit('/tools');
    cy.get('body').should('be.visible');
  });

  it('shows Tile Composer tool', () => {
    cy.visit('/tools');
    cy.contains('Tile Composer').should('exist');
  });
});

describe('Tic Tac Toe game page', () => {
  it('loads without crashing', () => {
    cy.visit('/games/tic-tac-toe');
    cy.get('body').should('be.visible');
  });

  it('renders the game board', () => {
    cy.visit('/games/tic-tac-toe');
    cy.get('button, [role="button"]', { timeout: 8000 }).should('have.length.gte', 1);
  });
});

describe('Car Shot game page', () => {
  it('loads without crashing', () => {
    cy.visit('/games/car-shot');
    cy.get('body').should('be.visible');
  });
});

describe('Dancing Crab game page', () => {
  it('loads without crashing', () => {
    cy.visit('/games/dancing-crab');
    cy.get('body').should('be.visible');
  });

  it('renders an iframe for the game', () => {
    cy.visit('/games/dancing-crab');
    cy.get('iframe', { timeout: 8000 }).should('exist');
  });
});

describe('404 handling', () => {
  it('returns a 404 for unknown routes', () => {
    cy.request({ url: '/does-not-exist-xyz', failOnStatusCode: false }).its('status').should('eq', 404);
  });
});
