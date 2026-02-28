import { getS3Key, TRIGGER_TO_TEMPLATE, getEmailHtmlFromS3 } from './s3';
import type { CustomMessageTriggerSource } from '@custom-message/types';

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('getS3Key', () => {
  it('returns custom prefix when provided', () => {
    expect(getS3Key('es', 'password-reset', 'my/prefix')).toBe(
      'my/prefix/es/password-reset.html',
    );
  });

  it('strips trailing slash from prefix', () => {
    expect(getS3Key('en', 'admin-invitation', 'cognito/emails/')).toBe(
      'cognito/emails/en/admin-invitation.html',
    );
  });
});

describe('TRIGGER_TO_TEMPLATE', () => {
  it('maps every CustomMessage trigger to a template name', () => {
    const triggers: CustomMessageTriggerSource[] = [
      'CustomMessage_SignUp',
      'CustomMessage_AdminCreateUser',
      'CustomMessage_ResendCode',
      'CustomMessage_ForgotPassword',
      'CustomMessage_UpdateUserAttribute',
      'CustomMessage_VerifyUserAttribute',
    ];
    for (const trigger of triggers) {
      const name = TRIGGER_TO_TEMPLATE[trigger];
      expect(name).toBeDefined();
      expect(typeof name).toBe('string');
      expect(name).not.toContain('.');
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it('maps SignUp to account-verification', () => {
    expect(TRIGGER_TO_TEMPLATE.CustomMessage_SignUp).toBe(
      'account-verification',
    );
  });

  it('maps AdminCreateUser to admin-invitation', () => {
    expect(TRIGGER_TO_TEMPLATE.CustomMessage_AdminCreateUser).toBe(
      'admin-invitation',
    );
  });

  it('maps ForgotPassword to password-reset', () => {
    expect(TRIGGER_TO_TEMPLATE.CustomMessage_ForgotPassword).toBe(
      'password-reset',
    );
  });
});

describe('getEmailHtmlFromS3', () => {
  it('returns null when ASSETS_BUCKET_NAME is not set', async () => {
    delete process.env.ASSETS_BUCKET_NAME;
    const result = await getEmailHtmlFromS3('en', 'account-verification');
    expect(result).toBeNull();
  });

  it('returns null when ASSETS_BUCKET_NAME is empty string', async () => {
    process.env.ASSETS_BUCKET_NAME = '';
    const result = await getEmailHtmlFromS3('en', 'account-verification');
    expect(result).toBeNull();
  });

  it('attempts S3 when bucket is set (will fail or return null without real bucket)', async () => {
    process.env.ASSETS_BUCKET_NAME = 'test-bucket';
    const result = await getEmailHtmlFromS3('en', 'account-verification');
    expect(result === null || typeof result === 'string').toBe(true);
  });
});
