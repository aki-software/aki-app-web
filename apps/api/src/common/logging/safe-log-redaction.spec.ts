import pino from 'pino';
import { Writable } from 'node:stream';
import { SAFE_LOG_REDACTION_PATHS } from './safe-log-redaction.js';

describe('SAFE_LOG_REDACTION_PATHS', () => {
  it('starts Pino and redacts sensitive fields at root and nested levels', () => {
    const chunks: string[] = [];
    const stream = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        chunks.push(chunk.toString());
        callback();
      },
    });

    const logger = pino(
      {
        redact: { paths: SAFE_LOG_REDACTION_PATHS, censor: '[REDACTED]' },
      },
      stream,
    );
    logger.info({
      event: 'http.exception',
      token: 'top-level-token-canary',
      email: 'top-level-email-canary',
      context: {
        email: 'nested-email-canary',
        objectKey: 'nested-object-key-canary',
        contentHash: 'nested-hash-canary',
        providerError: 'nested-provider-error-canary',
        storageError: 'nested-storage-error-canary',
      },
      req: {
        headers: {
          authorization: 'authorization-canary',
          cookie: 'cookie-canary',
          'x-api-key': 'api-key-canary',
          'set-cookie': 'set-cookie-canary',
        },
        query: { token: 'query-canary' },
        body: { answer: 'body-canary' },
      },
      err: {
        message: 'error-message-canary',
        stack: 'error-stack-canary',
      },
      status: 503,
    });

    const line = chunks.join('');
    expect(line).toContain('http.exception');
    expect(line).toContain('503');
    expect(line).toContain('[REDACTED]');
    for (const canary of [
      'top-level-token-canary',
      'top-level-email-canary',
      'nested-email-canary',
      'nested-object-key-canary',
      'nested-hash-canary',
      'nested-provider-error-canary',
      'nested-storage-error-canary',
      'authorization-canary',
      'cookie-canary',
      'api-key-canary',
      'set-cookie-canary',
      'query-canary',
      'body-canary',
      'error-message-canary',
      'error-stack-canary',
    ]) {
      expect(line).not.toContain(canary);
    }
  });
});
