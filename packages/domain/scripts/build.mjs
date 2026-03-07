import { DEFAULT_DOMAIN_LIMITS, validateSolveRequestDomain } from '../src/index.js';

validateSolveRequestDomain({ periods: [], days: [], medics: [], availability: [] }, { limits: DEFAULT_DOMAIN_LIMITS });

console.log('domain build ok');
