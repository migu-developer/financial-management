import { LinkProviderUseCase } from '@pre-signup/application/use-cases/link-provider.use-case';
import { LinkExistingProvidersUseCase } from '@pre-signup/application/use-cases/link-existing-providers.use-case';
import { parseExternalProvider } from '@pre-signup/infrastructure/adapters/provider-parser';
import type { CognitoAdminPort } from '@pre-signup/domain/ports/cognito-admin.port';
import type { PreSignUpEvent, PreSignUpTriggerSource } from '@pre-signup/types';

export type TriggerHandler = (
  event: PreSignUpEvent,
  cognitoAdmin: CognitoAdminPort,
) => Promise<string>;

export const TRIGGER_HANDLERS: Partial<
  Record<PreSignUpTriggerSource, TriggerHandler>
> = {
  // Social login → link to existing native user
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

  // Native signup → link any existing social accounts to this new native user
  PreSignUp_SignUp: async (event, cognitoAdmin) => {
    const { userName, userPoolId } = event;
    const email = event.request.userAttributes['email'];

    const useCase = new LinkExistingProvidersUseCase(cognitoAdmin);
    const result = await useCase.execute({
      userPoolId,
      email: email!,
      nativeUsername: userName,
    });

    if (result.action === 'linked') {
      return `linked-providers:${result.linkedProviders.join(',')}`;
    }

    return 'no-existing-providers';
  },
};
