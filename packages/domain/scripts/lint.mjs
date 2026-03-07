import { DEFAULT_DOMAIN_LIMITS } from '../src/index.js';

for (const [key, value] of Object.entries(DEFAULT_DOMAIN_LIMITS)) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid domain limit: ${key}`);
  }
}

console.log('domain lint ok');
