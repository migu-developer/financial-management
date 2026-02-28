import type { UploadEmailsS3Deps } from './upload-emails-s3';
import { uploadEmailsToS3 } from './upload-emails-s3';

describe('uploadEmailsToS3', () => {
  it('reads locale dirs and uploads each .html file to S3 with correct key and body', async () => {
    const sent: Array<{ Key: string; Body: string; Bucket: string }> = [];
    const mockS3Send = async (cmd: unknown) => {
      const c = cmd as { Key: string; Body: string; Bucket: string };
      sent.push({ Key: c.Key, Body: c.Body, Bucket: c.Bucket });
    };

    const enIndex = '<html>en index</html>';
    const enVerify = '<html>en verify</html>';
    const esIndex = '<html>es index</html>';
    const mockFs = {
      existsSync: () => true,
      readdirSync: (p: string) => {
        if (p === '/dist') return ['en', 'es'];
        if (p === '/dist/en')
          return ['index.html', 'account-verification.html'];
        if (p === '/dist/es') return ['index.html'];
        return [];
      },
      readFileSync: (filePath: string) => {
        if (filePath === '/dist/en/index.html') return enIndex;
        if (filePath === '/dist/en/account-verification.html') return enVerify;
        if (filePath === '/dist/es/index.html') return esIndex;
        return '';
      },
      statSync: (p: string) => ({
        isDirectory: () =>
          p !== '/dist/en/index.html' && p !== '/dist/es/index.html',
      }),
    };
    const mockPath = { join: (...parts: string[]) => parts.join('/') };

    const result = await uploadEmailsToS3({
      distPath: '/dist',
      bucket: 'my-bucket',
      prefix: 'cognito/emails',
      deps: {
        fs: mockFs as unknown as UploadEmailsS3Deps['fs'],
        path: mockPath,
        s3Send: mockS3Send,
      },
    });

    expect(result.uploadedCount).toBe(3);
    expect(result.keys).toEqual([
      'cognito/emails/en/index.html',
      'cognito/emails/en/account-verification.html',
      'cognito/emails/es/index.html',
    ]);
    expect(sent).toHaveLength(3);
    expect(sent.map((s) => s.Key)).toEqual(result.keys);
    expect(sent[0]!.Body).toBe(enIndex);
    expect(sent[1]!.Body).toBe(enVerify);
    expect(sent[2]!.Body).toBe(esIndex);
    sent.forEach((s) => expect(s.Bucket).toBe('my-bucket'));
  });

  it('normalizes prefix by stripping trailing slash', async () => {
    const sent: Array<{ Key: string }> = [];
    const mockFs = {
      existsSync: () => true,
      readdirSync: (p: string) => (p === '/d' ? ['en'] : ['a.html']),
      readFileSync: () => 'x',
      statSync: () => ({ isDirectory: () => true }),
    };
    const mockPath = { join: (...parts: string[]) => parts.join('/') };

    await uploadEmailsToS3({
      distPath: '/d',
      bucket: 'b',
      prefix: 'emails/',
      deps: {
        fs: mockFs as unknown as UploadEmailsS3Deps['fs'],
        path: mockPath,
        s3Send: async (cmd: unknown) => {
          sent.push({ Key: (cmd as { Key: string }).Key });
        },
      },
    });

    expect(sent[0]!.Key).toBe('emails/en/a.html');
  });

  it('skips non-directory entries in dist and non-.html files', async () => {
    const sent: Array<{ Key: string }> = [];
    const mockFs = {
      existsSync: () => true,
      readdirSync: (p: string) => {
        if (p === '/d') return ['en', 'file.txt'];
        if (p === '/d/en') return ['a.html', 'a.txt', 'b.html'];
        return [];
      },
      readFileSync: (fp: string) => (fp.endsWith('.html') ? 'html' : ''),
      statSync: (p: string) => ({
        isDirectory: () => {
          if (p === '/d') return true;
          if (p === '/d/file.txt') return false;
          if (p === '/d/en') return true;
          return true;
        },
      }),
    };
    const mockPath = { join: (...parts: string[]) => parts.join('/') };

    const result = await uploadEmailsToS3({
      distPath: '/d',
      bucket: 'b',
      prefix: 'p',
      deps: {
        fs: mockFs as unknown as UploadEmailsS3Deps['fs'],
        path: mockPath,
        s3Send: async (cmd: unknown) => {
          sent.push({ Key: (cmd as { Key: string }).Key });
        },
      },
    });

    expect(result.uploadedCount).toBe(2);
    expect(sent.map((s) => s!.Key)).toEqual(['p/en/a.html', 'p/en/b.html']);
  });
});
