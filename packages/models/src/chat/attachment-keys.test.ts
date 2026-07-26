import {
  ATTACHMENT_READY_PREFIX,
  ATTACHMENT_UPLOAD_PREFIX,
  assertKeyOwnedBy,
  parseAttachmentKey,
  toReadyKey,
} from './attachment-keys';
import { BadRequestError } from '@packages/models/shared/utils/errors';

const USER = 'user-123';
const UPLOAD = `${ATTACHMENT_UPLOAD_PREFIX}/${USER}/8f14e45f.jpg`;
const READY = `${ATTACHMENT_READY_PREFIX}/${USER}/8f14e45f.jpg`;

describe('parseAttachmentKey', () => {
  it('splits a well-formed key', () => {
    expect(parseAttachmentKey(UPLOAD, ATTACHMENT_UPLOAD_PREFIX)).toEqual({
      prefix: ATTACHMENT_UPLOAD_PREFIX,
      userId: USER,
      objectName: '8f14e45f.jpg',
    });
  });

  it('rejects traversal even when the prefix looks right', () => {
    expect(() =>
      parseAttachmentKey(
        `${ATTACHMENT_UPLOAD_PREFIX}/${USER}/../victim/x.jpg`,
        ATTACHMENT_UPLOAD_PREFIX,
      ),
    ).toThrow(BadRequestError);
  });

  it('rejects extra nested segments', () => {
    expect(() =>
      parseAttachmentKey(
        `${ATTACHMENT_UPLOAD_PREFIX}/${USER}/nested/x.jpg`,
        ATTACHMENT_UPLOAD_PREFIX,
      ),
    ).toThrow(BadRequestError);
  });

  it('rejects a key with no object name', () => {
    expect(() =>
      parseAttachmentKey(
        `${ATTACHMENT_UPLOAD_PREFIX}/${USER}/`,
        ATTACHMENT_UPLOAD_PREFIX,
      ),
    ).toThrow(BadRequestError);
  });

  it('rejects a key under a different prefix', () => {
    // This is what stops the chat workflow being pointed at a RAW upload: only
    // the normalization workflow can write to the ready prefix.
    expect(() => parseAttachmentKey(UPLOAD, ATTACHMENT_READY_PREFIX)).toThrow(
      BadRequestError,
    );
    expect(() =>
      parseAttachmentKey('emails/en/alert.html', ATTACHMENT_READY_PREFIX),
    ).toThrow(BadRequestError);
  });
});

describe('assertKeyOwnedBy', () => {
  it('accepts a key minted for the same user', () => {
    expect(() =>
      assertKeyOwnedBy(READY, USER, ATTACHMENT_READY_PREFIX),
    ).not.toThrow();
  });

  it("rejects another user's key", () => {
    expect(() =>
      assertKeyOwnedBy(
        `${ATTACHMENT_READY_PREFIX}/attacker/8f14e45f.jpg`,
        USER,
        ATTACHMENT_READY_PREFIX,
      ),
    ).toThrow(BadRequestError);
  });

  it('compares the owner segment exactly (user-1 must not match user-12)', () => {
    expect(() =>
      assertKeyOwnedBy(
        `${ATTACHMENT_READY_PREFIX}/user-12/x.jpg`,
        'user-1',
        ATTACHMENT_READY_PREFIX,
      ),
    ).toThrow(BadRequestError);
  });
});

describe('toReadyKey', () => {
  it('moves the key to the ready prefix, keeping the owner and stem', () => {
    expect(toReadyKey(UPLOAD, 'jpg')).toBe(READY);
  });

  it('replaces the extension with the ACTUAL output format', () => {
    // A HEIC upload that gets rewritten lands as .jpg, not .heic.
    expect(
      toReadyKey(`${ATTACHMENT_UPLOAD_PREFIX}/${USER}/abc.heic`, 'jpg'),
    ).toBe(`${ATTACHMENT_READY_PREFIX}/${USER}/abc.jpg`);
    // A passthrough keeps its own already-accepted format.
    expect(
      toReadyKey(`${ATTACHMENT_UPLOAD_PREFIX}/${USER}/abc.png`, 'png'),
    ).toBe(`${ATTACHMENT_READY_PREFIX}/${USER}/abc.png`);
  });

  it('handles a name with no extension', () => {
    expect(toReadyKey(`${ATTACHMENT_UPLOAD_PREFIX}/${USER}/abc`, 'jpg')).toBe(
      `${ATTACHMENT_READY_PREFIX}/${USER}/abc.jpg`,
    );
  });

  it('refuses to derive a ready key from a non-upload key', () => {
    expect(() => toReadyKey(READY, 'jpg')).toThrow(BadRequestError);
  });
});
