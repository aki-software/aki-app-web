import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { resetMockApi } from './mock-api-client';

afterEach(() => {
  resetMockApi();
});

