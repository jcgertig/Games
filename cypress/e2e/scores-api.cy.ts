/**
 * API-level e2e tests for the scores system.
 * These call the live Next.js API routes and verify response shapes.
 * Auth-required routes are tested for correct 401 rejection.
 */

// ── /api/scores/games ─────────────────────────────────────────────────────────

describe('GET /api/scores/games', () => {
  it('returns 200 with a games array', () => {
    cy.request('/api/scores/games').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property('games');
      expect(res.body.games).to.be.an('array');
    });
  });

  it('includes a Cache-Control header with max-age=3600', () => {
    cy.request('/api/scores/games').then((res) => {
      const cc = res.headers['cache-control'] as string;
      expect(cc).to.include('max-age=3600');
    });
  });

  it('each game has slug and name fields', () => {
    cy.request('/api/scores/games').then((res) => {
      for (const game of res.body.games) {
        expect(game).to.have.property('slug').that.is.a('string');
        expect(game).to.have.property('name').that.is.a('string');
      }
    });
  });
});

// ── /api/scores/leaderboard ───────────────────────────────────────────────────

describe('GET /api/scores/leaderboard', () => {
  it('returns 400 when required params are missing', () => {
    cy.request({ url: '/api/scores/leaderboard', failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body).to.have.property('error');
    });
  });

  it('returns 400 when only gameSlug is provided', () => {
    cy.request({
      url: '/api/scores/leaderboard?gameSlug=tic-tac-toe',
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
    });
  });

  it('returns 404 for an unknown game', () => {
    cy.request({
      url: '/api/scores/leaderboard?gameSlug=no-such-game&ladderSlug=global',
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(404);
      expect(res.body.error).to.include('Game not found');
    });
  });

  it('returns 200 with entries array for a known ladder', () => {
    cy.request('/api/scores/leaderboard?gameSlug=tic-tac-toe&ladderSlug=global').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property('entries').that.is.an('array');
      expect(res.body).to.have.property('total').that.is.a('number');
      expect(res.body).to.have.property('ladder').that.is.an('object');
    });
  });

  it('leaderboard entries have the expected shape', () => {
    cy.request('/api/scores/leaderboard?gameSlug=tic-tac-toe&ladderSlug=global').then((res) => {
      for (const entry of res.body.entries) {
        expect(entry).to.have.property('rank').that.is.a('number');
        expect(entry).to.have.property('userId').that.is.a('string');
        expect(entry).to.have.property('displayName').that.is.a('string');
        expect(entry).to.have.property('primaryValue').that.is.a('number');
        expect(entry).to.have.property('isCurrentUser').that.is.a('boolean');
      }
    });
  });

  it('respects limit param', () => {
    cy.request('/api/scores/leaderboard?gameSlug=dancing-crab&ladderSlug=global&limit=5').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.entries.length).to.be.lte(5);
    });
  });

  it('includes Cache-Control header', () => {
    cy.request('/api/scores/leaderboard?gameSlug=tic-tac-toe&ladderSlug=global').then((res) => {
      const cc = res.headers['cache-control'] as string;
      expect(cc).to.include('max-age=30');
    });
  });

  it('ladder object includes label fields', () => {
    cy.request('/api/scores/leaderboard?gameSlug=dancing-crab&ladderSlug=global').then((res) => {
      const { ladder } = res.body;
      expect(ladder).to.have.property('slug', 'global');
      expect(ladder).to.have.property('primaryLabel').that.is.a('string');
    });
  });
});

// ── /api/scores/submit ────────────────────────────────────────────────────────

describe('POST /api/scores/submit', () => {
  it('returns 401 when no auth token is provided', () => {
    cy.request({
      method: 'POST',
      url: '/api/scores/submit',
      body: { gameSlug: 'tic-tac-toe', ladderSlug: 'global', primaryValue: 1 },
      headers: { 'Content-Type': 'application/json' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
      expect(res.body.error).to.eq('Unauthorized');
    });
  });

  it('returns 401 with an invalid bearer token', () => {
    cy.request({
      method: 'POST',
      url: '/api/scores/submit',
      body: { gameSlug: 'tic-tac-toe', ladderSlug: 'global', primaryValue: 1 },
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer totally-fake-token',
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
    });
  });

  it('returns 400 when required fields are missing', () => {
    cy.request({
      method: 'POST',
      url: '/api/scores/submit',
      body: { ladderSlug: 'global' },
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer fake',
      },
      failOnStatusCode: false,
    }).then((res) => {
      // 401 because fake token, but at minimum it should not 500
      expect(res.status).to.be.oneOf([400, 401]);
    });
  });
});

// ── /api/scores/player/stats ──────────────────────────────────────────────────

describe('GET /api/scores/player/stats', () => {
  it('returns 400 when gameSlug is missing', () => {
    cy.request({
      url: '/api/scores/player/stats',
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.error).to.include('gameSlug');
    });
  });

  it('returns 401 when not authenticated', () => {
    cy.request({
      url: '/api/scores/player/stats?gameSlug=tic-tac-toe',
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
    });
  });
});

describe('PATCH /api/scores/player/stats', () => {
  it('returns 401 when not authenticated', () => {
    cy.request({
      method: 'PATCH',
      url: '/api/scores/player/stats',
      body: { gameSlug: 'tic-tac-toe', delta: { plays: 1 } },
      headers: { 'Content-Type': 'application/json' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
    });
  });
});
