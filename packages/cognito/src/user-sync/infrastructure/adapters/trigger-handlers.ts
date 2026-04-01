import { LinkExistingProvidersUseCase } from '@user-sync/application/use-cases/link-existing-providers.use-case';
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
   * PostConfirmation fires after Cognito creates a user.
   *
   * Social signup (PreSignUp already handled linking to native if exists):
   *   - If email exists in DB → skip (native owns the record, PreSignUp linked)
   *   - If email not in DB → create user
   *
   * Native signup:
   *   - If email exists in DB (social was first) → update uid to native's sub
   *   - If email not in DB → create user
   *   - Link existing social accounts in Cognito to this native user
   *     (uses LinkExistingProviders — these socials have NOT been signed up
   *      under native yet, so adminLinkProviderForUser works)
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
        actions.push('skipped');
      } else {
        await dbPort.create(mapToCreateInput(attrs), email);
        actions.push('created');
      }
    } else {
      const existing = await dbPort.findByEmail(email);
      if (existing) {
        await dbPort.updateUid(email, uid, email);
        actions.push('uid-updated');
      } else {
        await dbPort.create(mapToCreateInput(attrs), email);
        actions.push('created');
      }

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
   * Upsert: find by uid → patch, find by email → migrate uid + patch, else → create.
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
