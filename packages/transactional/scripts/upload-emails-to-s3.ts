// Reason: This script is used to upload the Cognito email templates to S3.
/* eslint-disable no-console */
/**
 * Uploads dist/{locale}/*.html to S3 at prefix cognito/emails/{locale}/{name}.html.
 * Requires: ASSETS_BUCKET_PREFIX, AWS_REGION, COGNITO_EMAILS_PREFIX.
 * Usage: pnpm email:upload
 */
import fs from 'node:fs';
import path from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from '@config/index';
import type {
  PutObjectParams,
  UploadEmailsS3Deps,
  UploadEmailsS3Options,
  UploadEmailsS3Result,
} from './lib/upload-emails-s3';
import { uploadEmailsToS3 } from './lib/upload-emails-s3';

export interface UploadScriptConfig {
  ASSETS_BUCKET_PREFIX?: string;
  AWS_REGION?: string;
  COGNITO_EMAILS_PREFIX?: string;
}

export interface UploadScriptDeps {
  fs: UploadEmailsS3Deps['fs'];
  path: UploadEmailsS3Deps['path'];
  cwd: string;
  uploadEmailsToS3: (
    options: UploadEmailsS3Options,
  ) => Promise<UploadEmailsS3Result>;
  s3Send: (params: PutObjectParams) => Promise<unknown>;
}

export type RunUploadEmailsResult =
  | {
      ok: true;
      uploadedCount: number;
      keys: string[];
      bucket: string;
      prefix: string;
    }
  | { ok: false; exitCode: number; message: string };

/**
 * Runs upload validations and upload logic. Used by the CLI and by tests.
 */
export async function runUploadEmailsScript(options: {
  config: UploadScriptConfig;
  deps: UploadScriptDeps;
}): Promise<RunUploadEmailsResult> {
  const { config: cfg, deps: dep } = options;
  const region = cfg.AWS_REGION;
  const bucket = [cfg.ASSETS_BUCKET_PREFIX, region].every(Boolean)
    ? `${cfg.ASSETS_BUCKET_PREFIX}-${region}-assets`
    : '';
  const prefix = cfg.COGNITO_EMAILS_PREFIX ?? '';
  const distPath = dep.path.join(dep.cwd, 'dist');

  if (!region) {
    return {
      ok: false,
      exitCode: 1,
      message: 'Set AWS_REGION (e.g. us-east-1).',
    };
  }
  if (!bucket) {
    return {
      ok: false,
      exitCode: 1,
      message: 'Set ASSETS_BUCKET_NAME (e.g. migudev-fm-us-east-1-assets).',
    };
  }
  if (!prefix) {
    return {
      ok: false,
      exitCode: 1,
      message: 'Set COGNITO_EMAILS_PREFIX (e.g. cognito/emails).',
    };
  }
  if (!dep.fs.existsSync(distPath)) {
    return {
      ok: false,
      exitCode: 1,
      message: `Dist folder not found: ${distPath}. Run pnpm email:export first.`,
    };
  }

  const result = await dep.uploadEmailsToS3({
    distPath,
    bucket,
    prefix,
    deps: {
      fs: dep.fs,
      path: dep.path,
      s3Send: dep.s3Send,
    },
  });
  return {
    ok: true,
    uploadedCount: result.uploadedCount,
    keys: result.keys,
    bucket,
    prefix,
  };
}

async function main() {
  const region = config.AWS_REGION;

  const result = await runUploadEmailsScript({
    config: {
      ASSETS_BUCKET_PREFIX: config.ASSETS_BUCKET_PREFIX,
      AWS_REGION: config.AWS_REGION,
      COGNITO_EMAILS_PREFIX: config.COGNITO_EMAILS_PREFIX,
    },
    deps: {
      fs,
      path,
      cwd: process.cwd(),
      uploadEmailsToS3,
      s3Send: (params) =>
        new S3Client({ region: region! }).send(new PutObjectCommand(params)),
    },
  });

  if (!result.ok) {
    console.error(result.message);
    process.exit(result.exitCode);
  }

  for (const key of result.keys)
    console.log(`Uploaded s3://${result.bucket}/${key}`);
  console.log(
    `Done. Uploaded ${result.uploadedCount} file(s) to s3://${result.bucket}/${result.prefix}`,
  );
}

if (typeof process.env.JEST_WORKER_ID === 'undefined') {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
