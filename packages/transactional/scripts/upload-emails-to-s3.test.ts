import type fs from 'node:fs';
import type { UploadScriptDeps } from './upload-emails-to-s3';
import { runUploadEmailsScript } from './upload-emails-to-s3';

const baseDeps: UploadScriptDeps = {
  fs: {
    existsSync: (): boolean => true,
    readdirSync: (): string[] => [],
    readFileSync: (): string => '',
    statSync: (): fs.Stats =>
      ({ isDirectory: () => false }) as unknown as fs.Stats,
  } as unknown as UploadScriptDeps['fs'],
  path: { join: (...parts: string[]) => parts.join('/') },
  cwd: '/project',
  uploadEmailsToS3: async () => ({ uploadedCount: 0, keys: [] }),
  s3Send: async () => ({}),
};

describe('runUploadEmailsScript validation (exit 1)', () => {
  it('returns exitCode 1 when AWS_REGION is missing', async () => {
    const result = await runUploadEmailsScript({
      config: {
        ASSETS_BUCKET_PREFIX: 'migudev-fm',
        COGNITO_EMAILS_PREFIX: 'cognito/emails',
      },
      deps: baseDeps,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('AWS_REGION');
    }
  });

  it('returns exitCode 1 when ASSETS_BUCKET_PREFIX is missing (bucket invalid)', async () => {
    const result = await runUploadEmailsScript({
      config: {
        ASSETS_BUCKET_PREFIX: '',
        AWS_REGION: 'us-east-1',
        COGNITO_EMAILS_PREFIX: 'cognito/emails',
      },
      deps: baseDeps,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.exitCode).toBe(1);
      expect(result.message).toMatch(/ASSETS_BUCKET_NAME|bucket/i);
    }
  });

  it('returns exitCode 1 when COGNITO_EMAILS_PREFIX is missing', async () => {
    const result = await runUploadEmailsScript({
      config: {
        ASSETS_BUCKET_PREFIX: 'migudev-fm',
        AWS_REGION: 'us-east-1',
        COGNITO_EMAILS_PREFIX: '',
      },
      deps: baseDeps,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('COGNITO_EMAILS_PREFIX');
    }
  });

  it('returns exitCode 1 when COGNITO_EMAILS_PREFIX is undefined', async () => {
    const result = await runUploadEmailsScript({
      config: {
        ASSETS_BUCKET_PREFIX: 'migudev-fm',
        AWS_REGION: 'us-east-1',
      },
      deps: baseDeps,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('COGNITO_EMAILS_PREFIX');
    }
  });

  it('returns exitCode 1 when dist folder does not exist', async () => {
    const result = await runUploadEmailsScript({
      config: {
        ASSETS_BUCKET_PREFIX: 'migudev-fm',
        AWS_REGION: 'us-east-1',
        COGNITO_EMAILS_PREFIX: 'cognito/emails',
      },
      deps: {
        ...baseDeps,
        fs: {
          ...baseDeps.fs,
          existsSync: (path: fs.PathLike) => String(path) !== '/project/dist',
        } as unknown as UploadScriptDeps['fs'],
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Dist folder not found');
      expect(result.message).toContain('/project/dist');
      expect(result.message).toContain('pnpm email:export');
    }
  });
});
