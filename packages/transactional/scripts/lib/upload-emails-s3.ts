/**
 * Core logic for uploading exported email HTML files to S3.
 * Used by scripts/upload-emails-to-s3.ts; injectable deps for testing.
 */
import type fs from 'node:fs';
import type path from 'node:path';

export interface PutObjectParams {
  Bucket: string;
  Key: string;
  Body: string;
  ContentType: string;
}

export interface UploadEmailsS3Deps {
  fs: Pick<
    typeof fs,
    'existsSync' | 'readdirSync' | 'readFileSync' | 'statSync'
  >;
  path: Pick<typeof path, 'join'>;
  s3Send: (params: PutObjectParams) => Promise<unknown>;
}

export interface UploadEmailsS3Options {
  distPath: string;
  bucket: string;
  prefix: string;
  deps: UploadEmailsS3Deps;
}

export interface UploadEmailsS3Result {
  uploadedCount: number;
  keys: string[];
}

/**
 * Reads distPath/{locale}/*.html and uploads each to S3 at prefix/{locale}/{file}.
 * Returns count and list of S3 keys uploaded.
 */
export async function uploadEmailsToS3(
  options: UploadEmailsS3Options,
): Promise<UploadEmailsS3Result> {
  const { distPath, bucket, prefix, deps } = options;
  const { fs: fsMod, path: pathMod, s3Send } = deps;

  const keys: string[] = [];
  const normalizedPrefix = prefix.replace(/\/$/, '');
  const localeDirs = fsMod.readdirSync(distPath);

  for (const locale of localeDirs) {
    const localePath = pathMod.join(distPath, locale);
    if (!fsMod.statSync(localePath).isDirectory()) continue;

    const files = fsMod.readdirSync(localePath);
    for (const file of files) {
      if (!file.endsWith('.html')) continue;
      const key = `${normalizedPrefix}/${locale}/${file}`;
      const body = fsMod.readFileSync(pathMod.join(localePath, file), 'utf-8');
      await s3Send({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: 'text/html; charset=utf-8',
      });
      keys.push(key);
    }
  }

  return { uploadedCount: keys.length, keys };
}
