export interface User {
  readonly userId: string;
  readonly givenName: string;
  readonly fullname: string;
  readonly email: string;
  readonly phoneNumber?: string;
  readonly birthdate?: string;
  readonly profilePicture?: string;
  readonly locale?: string;
  readonly address?: string;
  readonly lastUpdateTime?: Date;
  readonly emailVerified: boolean;
  readonly phoneVerified: boolean;
}
