import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetMockApi } from './mock-api-client';

afterEach(() => {
  cleanup();
  resetMockApi();
});

