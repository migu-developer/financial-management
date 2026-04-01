import { LinkProviderUseCase } from '@user-sync/application/use-cases/link-provider.use-case';
import { parseExternalProvider } from '@user-sync/infrastructure/adapters/provider-parser';
import type { CognitoAdminPort } from '@user-sync/domain/ports/cognito-admin.port';
import type { PreSignUpEvent, PreSignUpTriggerSource } from '@pre-signup/types';

export type TriggerHandler = (
  event: PreSignUpEvent,
  cognitoAdmin: CognitoAdminPort,
) => Promise<string>;

export const TRIGGER_HANDLERS: Partial<
  Record<PreSignUpTriggerSource, TriggerHandler>
> = {
  PreSignUp_ExternalProvider: async (event, cognitoAdmin) => {
    const { userName, userPoolId } = event;
    const email = event.request.userAttributes['email'];

    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;

    const provider = parseExternalProvider(userName);
    if (!provider) return 'auto-confirmed';

    const useCase = new LinkProviderUseCase(cognitoAdmin);
    const result = await useCase.execute({
      userPoolId,
      email: email!,
      providerName: provider.name,
      providerUserId: provider.userId,
    });

    return result.action;
  },
};
