import { SyncUserOnSignupUseCase } from '@user-sync/application/use-cases/sync-user-on-signup.use-case';
import { SyncUserOnLoginUseCase } from '@user-sync/application/use-cases/sync-user-on-login.use-case';
import {
  mapToCreateInput,
  mapToPatchInput,
} from '@user-sync/infrastructure/adapters/cognito-user.mapper';
import type { UserSyncTriggerSource } from '@user-sync/types';
import type { UserSyncPort } from '@user-sync/domain/ports/user-sync.port';

export type TriggerHandler = (
  attrs: Record<string, string>,
  port: UserSyncPort,
) => Promise<string>;

export const TRIGGER_HANDLERS: Partial<
  Record<UserSyncTriggerSource, TriggerHandler>
> = {
  PostConfirmation_ConfirmSignUp: async (attrs, port) => {
    const useCase = new SyncUserOnSignupUseCase(port);
    const result = await useCase.execute(
      mapToCreateInput(attrs),
      attrs['email']!,
    );
    return result.action;
  },

  PostAuthentication_Authentication: async (attrs, port) => {
    const useCase = new SyncUserOnLoginUseCase(port);
    const result = await useCase.execute(
      attrs['sub']!,
      mapToCreateInput(attrs),
      mapToPatchInput(attrs),
      attrs['email']!,
    );
    return result.action;
  },
};
