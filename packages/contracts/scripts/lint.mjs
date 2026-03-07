import { createValidatorSet } from '../src/index.js';

const validators = createValidatorSet();

for (const key of Object.keys(validators)) {
  if (key.startsWith('validate') && typeof validators[key] !== 'function') {
    throw new Error(`Missing validator function: ${key}`);
  }
}

console.log('contracts lint ok');
