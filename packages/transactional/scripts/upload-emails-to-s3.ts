// Reason: This script is used to upload the Cognito email templates to S3.
/* eslint-disable no-console */
/**
 * Uploads dist/{locale}/*.html to S3 at prefix cognito/emails/{locale}/{name}.html.
 * Requires: ASSETS_BUCKET_NAME, AWS_REGION (or AWS_DEFAULT_REGION).
 * Optional: COGNITO_EMAILS_PREFIX (default cognito/emails).
 * Usage: pnpm email:upload
 */
import fs from 'node:fs';
import path from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from '@config/index';
import { uploadEmailsToS3 } from './lib/upload-emails-s3';

const DIST = path.join(process.cwd(), 'dist');
const PREFIX = config.COGNITO_EMAILS_PREFIX;

async function main() {
  const bucket = `${config.ASSETS_BUCKET_PREFIX}-${config.AWS_REGION}-assets`;
  const region = config.AWS_REGION ?? config.AWS_DEFAULT_REGION;

  if (!region) {
    console.error('Set AWS_REGION or AWS_DEFAULT_REGION (e.g. us-east-1).');
    process.exit(1);
  }

  if (!bucket) {
    console.error('Set ASSETS_BUCKET_NAME (e.g. migudev-fm-us-east-1-assets).');
    process.exit(1);
  }

  if (!PREFIX) {
    console.error('Set COGNITO_EMAILS_PREFIX (e.g. cognito/emails).');
    process.exit(1);
  }

  if (!fs.existsSync(DIST)) {
    console.error(
      `Dist folder not found: ${DIST}. Run pnpm email:export first.`,
    );
    process.exit(1);
  }

  const client = new S3Client({ region });
  const { uploadedCount, keys } = await uploadEmailsToS3({
    distPath: DIST,
    bucket,
    prefix: PREFIX,
    deps: {
      fs,
      path,
      s3Send: (params) => client.send(new PutObjectCommand(params)),
    },
  });

  for (const key of keys) console.log(`Uploaded s3://${bucket}/${key}`);
  console.log(
    `Done. Uploaded ${uploadedCount} file(s) to s3://${bucket}/${PREFIX}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
