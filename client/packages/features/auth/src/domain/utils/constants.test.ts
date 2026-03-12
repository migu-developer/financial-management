import {
  EMAIL_REGEX,
  PHONE_START_REGEX,
  SPECIAL_CHARS_REGEX,
  PHONE_FORMAT_REGEX,
  DEFAULT_COUNTRY,
  KeyEventNames,
} from '@features/auth/domain/utils/constants';

describe('EMAIL_REGEX', () => {
  const valid = [
    'user@example.com',
    'user.name@example.com',
    'user+tag@sub.domain.co',
    'USER@EXAMPLE.COM',
    '123@numbers.org',
  ];

  const invalid = [
    '',
    'notanemail',
    '@nodomain.com',
    'missingat.com',
    'missing@',
    'missing@.',
    'space @example.com',
    'user@@example.com',
  ];

  test.each(valid)('matches valid email: %s', (email) => {
    expect(EMAIL_REGEX.test(email)).toBe(true);
  });

  test.each(invalid)('rejects invalid email: %s', (email) => {
    expect(EMAIL_REGEX.test(email)).toBe(false);
  });
});

describe('PHONE_START_REGEX', () => {
  const valid = ['+573001234567', '3001234567', '1800555000', '+1 800 555 000'];

  const invalid = ['', 'abc123', ' +57300', '(300)'];

  test.each(valid)('matches phone-start input: %s', (input) => {
    expect(PHONE_START_REGEX.test(input)).toBe(true);
  });

  test.each(invalid)('rejects non-phone-start input: %s', (input) => {
    expect(PHONE_START_REGEX.test(input)).toBe(false);
  });
});

describe('SPECIAL_CHARS_REGEX', () => {
  const withSpecial = [
    'p@ss',
    'p#ss',
    'p!ss',
    'p$ss',
    'p%ss',
    'p^ss',
    'p&ss',
    'p*ss',
    'p(ss',
    'p)ss',
    'p_ss',
    'p+ss',
    'p-ss',
    'p=ss',
    'p[ss',
    'p]ss',
    'p{ss',
    'p}ss',
    'p;ss',
    'p:ss',
    "p'ss",
    'p"ss',
    'p|ss',
    'p,ss',
    'p.ss',
    'p<ss',
    'p>ss',
    'p/ss',
    'p?ss',
  ];
  const withoutSpecial = ['password', 'PassWord123', 'simpletext', 'ALLCAPS'];

  test.each(withSpecial)('matches string with special char: %s', (input) => {
    expect(SPECIAL_CHARS_REGEX.test(input)).toBe(true);
  });

  test.each(withoutSpecial)(
    'rejects string without special chars: %s',
    (input) => {
      expect(SPECIAL_CHARS_REGEX.test(input)).toBe(false);
    },
  );
});

describe('PHONE_FORMAT_REGEX', () => {
  const valid = [
    '+573001234567',
    '3001234567',
    '+1 800 555 0100',
    '+57-300-123-4567',
    '(300) 123.4567',
  ];

  const invalid = [
    '',
    'abc',
    '123',
    '1'.repeat(21),
    'user@email.com',
    'abc+123',
  ];

  test.each(valid)('matches valid phone format: %s', (input) => {
    expect(PHONE_FORMAT_REGEX.test(input)).toBe(true);
  });

  test.each(invalid)('rejects invalid phone format: %s', (input) => {
    expect(PHONE_FORMAT_REGEX.test(input)).toBe(false);
  });
});

describe('DEFAULT_COUNTRY', () => {
  it('returns "US" as default country code', () => {
    expect(DEFAULT_COUNTRY).toBe('US');
  });
});

describe('KeyEventNames', () => {
  it('returns "Backspace" as key event name', () => {
    expect(KeyEventNames.BACKSPACE).toBe('Backspace');
  });
});
