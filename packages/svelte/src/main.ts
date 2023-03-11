import App from './App.svelte';

import './app.postcss';

function assertIsNonNullable<T>(value: T | undefined | null): asserts value is T {
  if (value === null || typeof value === 'undefined') {
    throw new Error('Expected value to be non-nullable');
  }
}

const target = document.getElementById('app');
assertIsNonNullable(target);
const app = new App({
  target,
});

export default app;
