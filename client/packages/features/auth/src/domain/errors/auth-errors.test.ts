import {
  AuthError,
  NotAuthorizedException,
  UserNotFoundException,
  UsernameExistsException,
  AliasExistsException,
  CodeMismatchException,
  ExpiredCodeException,
  InvalidPasswordException,
  UserNotConfirmedException,
  PasswordResetRequiredException,
  TooManyRequestsException,
  NetworkException,
  UnknownAuthException,
} from '@features/auth/domain/errors/auth-errors';

describe('AuthErrors', () => {
  const cases: [new (...args: never[]) => AuthError, string, string][] = [
    [
      NotAuthorizedException,
      'NotAuthorizedException',
      'NotAuthorizedException',
    ],
    [UserNotFoundException, 'UserNotFoundException', 'UserNotFoundException'],
    [
      UsernameExistsException,
      'UsernameExistsException',
      'UsernameExistsException',
    ],
    [AliasExistsException, 'AliasExistsException', 'AliasExistsException'],
    [CodeMismatchException, 'CodeMismatchException', 'CodeMismatchException'],
    [ExpiredCodeException, 'ExpiredCodeException', 'ExpiredCodeException'],
    [
      UserNotConfirmedException,
      'UserNotConfirmedException',
      'UserNotConfirmedException',
    ],
    [
      PasswordResetRequiredException,
      'PasswordResetRequiredException',
      'PasswordResetRequiredException',
    ],
    [
      TooManyRequestsException,
      'TooManyRequestsException',
      'TooManyRequestsException',
    ],
    [NetworkException, 'NetworkException', 'NetworkException'],
    [UnknownAuthException, 'UnknownAuthException', 'UnknownAuthException'],
  ];

  test.each(cases)(
    '%s extends AuthError with correct code',
    (ErrorClass, expectedName, expectedCode) => {
      const error = new (ErrorClass as new () => AuthError)();
      expect(error).toBeInstanceOf(AuthError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe(expectedName);
      expect(error.code).toBe(expectedCode);
      expect(typeof error.message).toBe('string');
      expect(error.message.length).toBeGreaterThan(0);
    },
  );

  it('InvalidPasswordException uses default message when none provided', () => {
    const error = new InvalidPasswordException();
    expect(error.name).toBe('InvalidPasswordException');
    expect(error.code).toBe('InvalidPasswordException');
    expect(error.message).toBe('Password does not conform to policy.');
  });

  it('InvalidPasswordException uses custom message when provided', () => {
    const error = new InvalidPasswordException('Custom message');
    expect(error.message).toBe('Custom message');
  });

  it('UnknownAuthException uses custom message when provided', () => {
    const error = new UnknownAuthException('Something went wrong');
    expect(error.message).toBe('Something went wrong');
  });
});
