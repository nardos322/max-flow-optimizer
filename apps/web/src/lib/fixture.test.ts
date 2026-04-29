import { describe, expect, it } from 'vitest';

import { FIXTURE_DRAFT, parseDraftFile } from './fixture.js';

describe('fixture helpers', () => {
  it('parses a valid draft file for import', async () => {
    const file = new File([JSON.stringify(FIXTURE_DRAFT)], 'fixture.json', {
      type: 'application/json'
    });

    await expect(parseDraftFile(file)).resolves.toEqual(FIXTURE_DRAFT);
  });
});
