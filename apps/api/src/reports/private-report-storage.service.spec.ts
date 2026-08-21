import { PrivateReportStorageService } from './private-report-storage.service';

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn((input) => ({ input })),
  HeadObjectCommand: jest.fn((input) => ({ input })),
  DeleteObjectCommand: jest.fn((input) => ({ input })),
}));

describe('PrivateReportStorageService', () => {
  const config = (values: Record<string, string | undefined>) => ({
    get: (key: string) => values[key],
  });
  const valid = {
    S3_ENDPOINT: 'https://r2.test',
    S3_BUCKET: 'reports',
    S3_REGION: 'auto',
    S3_ACCESS_KEY: 'key',
    S3_SECRET_KEY: 'secret',
  };

  beforeEach(() => jest.clearAllMocks());

  it.each([
    [undefined, 'reports/session-1/v2.pdf'],
    ['qa', 'qa/reports/session-1/v2.pdf'],
    ['prod', 'prod/reports/session-1/v2.pdf'],
  ])('builds report keys for prefix %s', (REPORT_STORAGE_PREFIX, expected) => {
    const storage = new PrivateReportStorageService(
      config({ ...valid, REPORT_STORAGE_PREFIX }) as any,
    );

    expect(storage.buildReportObjectKey('session-1', 2)).toBe(expected);
  });

  it.each(['../qa', 'qa//blue', '/qa', 'qa/', 'qa/../prod'])(
    'rejects invalid storage prefixes',
    (REPORT_STORAGE_PREFIX) => {
      expect(
        () =>
          new PrivateReportStorageService(
            config({ ...valid, REPORT_STORAGE_PREFIX }) as any,
          ),
      ).toThrow('REPORT_STORAGE_PREFIX');
    },
  );

  it('uploads immutable private metadata without an ACL or URL', async () => {
    mockSend.mockResolvedValue({ ETag: 'etag', VersionId: 'v1' });
    const storage = new PrivateReportStorageService(config(valid) as any);
    await expect(
      storage.put('reports/a.pdf', Buffer.from('pdf'), {
        contentHash: 'hash',
        version: 1,
      }),
    ).resolves.toEqual({
      objectKey: 'reports/a.pdf',
      etag: 'etag',
      versionId: 'v1',
    });
    expect(mockSend.mock.calls[0][0].input).toEqual(
      expect.objectContaining({
        Bucket: 'reports',
        Key: 'reports/a.pdf',
        ContentType: 'application/pdf',
        ContentLength: 3,
        Metadata: { contentHash: 'hash', version: '1' },
        IfNoneMatch: '*',
      }),
    );
    expect(mockSend.mock.calls[0][0].input).not.toHaveProperty('ACL');
  });

  it('fails clearly without configuration and supports head/delete without leaking credentials', async () => {
    expect(
      () =>
        new PrivateReportStorageService(
          config({ ...valid, S3_SECRET_KEY: undefined }) as any,
        ),
    ).toThrow('S3_SECRET_KEY is required');
    const storage = new PrivateReportStorageService(config(valid) as any);
    mockSend
      .mockResolvedValueOnce({ Metadata: { version: '1' } })
      .mockResolvedValueOnce({});
    await expect(storage.head('reports/a.pdf')).resolves.toEqual({
      version: '1',
    });
    await expect(storage.delete('reports/a.pdf')).resolves.toBeUndefined();
  });

  it('only treats not-found heads as absent and exposes immutable collisions', async () => {
    const storage = new PrivateReportStorageService(config(valid) as any);
    mockSend.mockRejectedValueOnce({
      name: 'NotFound',
      $metadata: { httpStatusCode: 404 },
    });
    await expect(storage.head('reports/a.pdf')).resolves.toBeNull();
    mockSend.mockRejectedValueOnce({
      name: 'AccessDenied',
      $metadata: { httpStatusCode: 403 },
    });
    await expect(storage.head('reports/a.pdf')).rejects.toThrow(
      'Private report storage failed.',
    );
    mockSend.mockRejectedValueOnce({
      name: 'PreconditionFailed',
      $metadata: { httpStatusCode: 412 },
    });
    await expect(
      storage.put('reports/a.pdf', Buffer.from('x'), {
        contentHash: 'h',
        version: 1,
      }),
    ).rejects.toMatchObject({ code: 'IMMUTABLE_REPORT_OBJECT_COLLISION' });
  });

  it('redacts upload and delete SDK failures', async () => {
    const storage = new PrivateReportStorageService(config(valid) as any);
    mockSend
      .mockRejectedValueOnce(new Error('secret endpoint'))
      .mockRejectedValueOnce(new Error('secret endpoint'));
    await expect(
      storage.put('reports/a.pdf', Buffer.from('x'), {
        contentHash: 'h',
        version: 1,
      }),
    ).rejects.toThrow('Private report storage failed.');
    await expect(storage.delete('reports/a.pdf')).rejects.toThrow(
      'Private report storage failed.',
    );
  });
});
