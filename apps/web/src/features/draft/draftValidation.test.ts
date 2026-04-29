import { describe, expect, it } from 'vitest';

import { FIXTURE_DRAFT } from '../../lib/fixture.js';
import { getDraftIssue } from './draftValidation.js';

describe('draft validation helpers', () => {
  it('returns the first draft issue for incomplete input', () => {
    const issue = getDraftIssue({
      ...FIXTURE_DRAFT,
      medics: []
    });

    expect(issue).toMatchObject({
      source: 'schema'
    });
  });
});
