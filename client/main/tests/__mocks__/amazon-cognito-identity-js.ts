class CognitoUserPool {
  getCurrentUser() {
    return null;
  }
  signUp(
    _username: string,
    _password: string,
    _attributes: unknown[],
    _validationData: unknown[],
    cb: (err: Error | null) => void,
  ) {
    cb(null);
  }
}

class CognitoUser {
  getUsername() {
    return 'mock-user';
  }
  authenticateUser(
    _details: unknown,
    callbacks: { onSuccess: Function; onFailure: Function },
  ) {
    callbacks.onFailure(new Error('mock'));
  }
  confirmRegistration(
    _code: string,
    _force: boolean,
    cb: (err: Error | null) => void,
  ) {
    cb(null);
  }
  resendConfirmationCode(cb: (err: Error | null) => void) {
    cb(null);
  }
  getSession(cb: (err: Error | null, session: null) => void) {
    cb(null, null);
  }
  getUserAttributes(cb: (err: Error | null, attrs: unknown[] | null) => void) {
    cb(null, null);
  }
  forgotPassword(callbacks: { onSuccess: Function; onFailure: Function }) {
    callbacks.onSuccess();
  }
  confirmPassword(
    _code: string,
    _newPassword: string,
    callbacks: { onSuccess: Function; onFailure: Function },
  ) {
    callbacks.onSuccess();
  }
  associateSoftwareToken(callbacks: {
    associateSecretCode: Function;
    onFailure: Function;
  }) {
    callbacks.associateSecretCode('mock-secret');
  }
  verifySoftwareToken(
    _code: string,
    _device: string,
    callbacks: { onSuccess: Function; onFailure: Function },
  ) {
    callbacks.onSuccess();
  }
  sendMFACode(
    _code: string,
    callbacks: { onSuccess: Function; onFailure: Function },
    _type: string,
  ) {
    callbacks.onFailure(new Error('mock'));
  }
  completeNewPasswordChallenge(
    _pass: string,
    _attrs: unknown,
    callbacks: { onSuccess: Function; onFailure: Function },
  ) {
    callbacks.onFailure(new Error('mock'));
  }
  globalSignOut(callbacks: { onSuccess: Function; onFailure: Function }) {
    callbacks.onSuccess();
  }
  signOut(cb?: Function) {
    cb?.();
  }
  refreshSession(
    _token: unknown,
    cb: (err: Error | null, session: null) => void,
  ) {
    cb(new Error('mock'), null);
  }
}

class AuthenticationDetails {}

class CognitoUserAttribute {
  private name: string;
  private value: string;
  constructor(config: { Name: string; Value: string }) {
    this.name = config.Name;
    this.value = config.Value;
  }
  getName() {
    return this.name;
  }
  getValue() {
    return this.value;
  }
}

class CognitoUserSession {
  getAccessToken() {
    return { getJwtToken: () => '', getExpiration: () => 0 };
  }
  getIdToken() {
    return { getJwtToken: () => '', payload: { sub: '' } };
  }
  getRefreshToken() {
    return { getToken: () => '' };
  }
  isValid() {
    return false;
  }
}

export {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
};
