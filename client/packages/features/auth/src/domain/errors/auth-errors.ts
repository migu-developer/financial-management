export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class NotAuthorizedException extends AuthError {
  constructor() {
    super('Incorrect username or password.', 'NotAuthorizedException');
    this.name = 'NotAuthorizedException';
  }
}

export class UserNotFoundException extends AuthError {
  constructor() {
    super('User does not exist.', 'UserNotFoundException');
    this.name = 'UserNotFoundException';
  }
}

export class UsernameExistsException extends AuthError {
  constructor() {
    super(
      'An account with the given email already exists.',
      'UsernameExistsException',
    );
    this.name = 'UsernameExistsException';
  }
}

export class AliasExistsException extends AuthError {
  constructor() {
    super(
      'An account with this email or phone number already exists.',
      'AliasExistsException',
    );
    this.name = 'AliasExistsException';
  }
}

export class CodeMismatchException extends AuthError {
  constructor() {
    super('Invalid verification code provided.', 'CodeMismatchException');
    this.name = 'CodeMismatchException';
  }
}

export class ExpiredCodeException extends AuthError {
  constructor() {
    super(
      'Invalid code provided, please request a code again.',
      'ExpiredCodeException',
    );
    this.name = 'ExpiredCodeException';
  }
}

export class InvalidPasswordException extends AuthError {
  constructor(message?: string) {
    super(
      message ?? 'Password does not conform to policy.',
      'InvalidPasswordException',
    );
    this.name = 'InvalidPasswordException';
  }
}

export class UserNotConfirmedException extends AuthError {
  constructor() {
    super('User is not confirmed.', 'UserNotConfirmedException');
    this.name = 'UserNotConfirmedException';
  }
}

export class PasswordResetRequiredException extends AuthError {
  constructor() {
    super(
      'Password reset required for this user.',
      'PasswordResetRequiredException',
    );
    this.name = 'PasswordResetRequiredException';
  }
}

export class TooManyRequestsException extends AuthError {
  constructor() {
    super(
      'Too many requests. Please wait and try again.',
      'TooManyRequestsException',
    );
    this.name = 'TooManyRequestsException';
  }
}

export class NetworkException extends AuthError {
  constructor() {
    super('Network error. Please check your connection.', 'NetworkException');
    this.name = 'NetworkException';
  }
}

export class UnknownAuthException extends AuthError {
  constructor(originalMessage?: string) {
    super(
      originalMessage ?? 'An unexpected error occurred.',
      'UnknownAuthException',
    );
    this.name = 'UnknownAuthException';
  }
}
