import { LinkExistingProvidersUseCase } from '@user-sync/application/use-cases/link-existing-providers.use-case';
import { LinkProviderUseCase } from '@user-sync/application/use-cases/link-provider.use-case';
import { parseExternalProvider } from '@user-sync/infrastructure/adapters/provider-parser';
import {
  mapToCreateInput,
  mapToPatchInput,
} from '@user-sync/infrastructure/adapters/cognito-user.mapper';
import type {
  CognitoUserSyncEvent,
  UserSyncTriggerSource,
} from '@user-sync/types';
import type { UserSyncPort } from '@user-sync/domain/ports/user-sync.port';
import type { CognitoAdminPort } from '@user-sync/domain/ports/cognito-admin.port';

export interface TriggerDeps {
  dbPort: UserSyncPort;
  cognitoAdmin: CognitoAdminPort;
}

export type TriggerHandler = (
  event: CognitoUserSyncEvent,
  deps: TriggerDeps,
) => Promise<string>;

export const TRIGGER_HANDLERS: Partial<
  Record<UserSyncTriggerSource, TriggerHandler>
> = {
  /**
   * PostConfirmation fires after Cognito creates a user (native or social).
   *
   * Native signup:
   *   - If email exists in DB (social was first) → update uid to native's sub + link socials
   *   - If email not in DB → create user + link socials if any exist in Cognito
   *
   * Social signup:
   *   - If email exists in DB (native was first) → link social to native in Cognito (uid stays native)
   *   - If email not in DB → create user in DB
   */
  PostConfirmation_ConfirmSignUp: async (event, { dbPort, cognitoAdmin }) => {
    const attrs = event.request.userAttributes;
    const email = attrs['email']!;
    const uid = attrs['sub']!;
    const isSocial = parseExternalProvider(event.userName) !== null;
    const actions: string[] = [];

    if (isSocial) {
      const existing = await dbPort.findByEmail(email);

      if (existing) {
        // Native user already in DB → link this social to the native in Cognito
        const provider = parseExternalProvider(event.userName)!;
        const cognitoUsers = await cognitoAdmin.listUsersByEmail(
          event.userPoolId,
          email,
        );
        const nativeUser = cognitoUsers.find(
          (u) => parseExternalProvider(u.username) === null,
        );

        if (nativeUser) {
          const linkUseCase = new LinkProviderUseCase(cognitoAdmin);
          await linkUseCase.execute({
            userPoolId: event.userPoolId,
            email,
            providerName: provider.name,
            providerUserId: provider.userId,
          });
          actions.push('linked-to-native');
        } else {
          actions.push('native-not-in-cognito');
        }
      } else {
        await dbPort.create(mapToCreateInput(attrs), email);
        actions.push('created');
      }
    } else {
      // Native signup
      const existing = await dbPort.findByEmail(email);

      if (existing) {
        // Social user was first → update uid to native's sub
        await dbPort.updateUid(email, uid, email);
        actions.push('uid-updated');
      } else {
        await dbPort.create(mapToCreateInput(attrs), email);
        actions.push('created');
      }

      // Link any existing social accounts in Cognito to this native user
      const linkUseCase = new LinkExistingProvidersUseCase(cognitoAdmin);
      const linkResult = await linkUseCase.execute({
        userPoolId: event.userPoolId,
        email,
        nativeUsername: event.userName,
      });
      if (linkResult.action === 'linked') {
        actions.push(`linked:${linkResult.linkedProviders.join(',')}`);
      }
    }

    return actions.join('+');
  },

  /**
   * PostAuthentication fires on every login.
   * Upsert: if user exists → patch, if not → create.
   */
  PostAuthentication_Authentication: async (event, { dbPort }) => {
    const attrs = event.request.userAttributes;
    const uid = attrs['sub']!;
    const email = attrs['email']!;

    const existing = await dbPort.findByUid(uid);

    if (existing) {
      await dbPort.patch(uid, mapToPatchInput(attrs), email);
      return 'updated';
    }

    // User might exist with different uid (social→native migration)
    const byEmail = await dbPort.findByEmail(email);
    if (byEmail) {
      await dbPort.updateUid(email, uid, email);
      await dbPort.patch(uid, mapToPatchInput(attrs), email);
      return 'uid-migrated+updated';
    }

    await dbPort.create(mapToCreateInput(attrs), email);
    return 'created';
  },
};
