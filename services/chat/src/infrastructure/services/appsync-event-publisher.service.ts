import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import type {
  ChatEventPayload,
  EventPublisherService,
} from '@services/chat/domain/services/event-publisher.service';

/**
 * Publishes events to the AppSync Events HTTP endpoint with SigV4 IAM auth.
 *
 * AppSync Events accepts POST {httpDns}/event with a body of the shape:
 *   { "channel": "<namespace>/<channel-path>",
 *     "events": ["<stringified JSON>"] }
 *
 * The Lambda's IAM role grants appsync:EventPublish on the Event API ARN
 * (configured by the CDK stack). Credentials come from the standard
 * Lambda environment via `defaultProvider`.
 */
export class AppSyncEventPublisher implements EventPublisherService {
  private readonly signer: SignatureV4;

  constructor(
    private readonly httpDns: string,
    region: string,
  ) {
    this.signer = new SignatureV4({
      service: 'appsync',
      region,
      credentials: defaultProvider(),
      sha256: Sha256,
    });
  }

  async publish(channel: string, payload: ChatEventPayload): Promise<void> {
    if (!this.httpDns) {
      throw new Error(
        'APPSYNC_HTTP_DNS is not configured. Cannot publish chat events.',
      );
    }

    const body = JSON.stringify({
      channel,
      events: [JSON.stringify(payload)],
    });

    const request = new HttpRequest({
      method: 'POST',
      protocol: 'https:',
      hostname: this.httpDns,
      path: '/event',
      headers: {
        'content-type': 'application/json',
        host: this.httpDns,
      },
      body,
    });

    const signed = await this.signer.sign(request);
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(signed.headers)) {
      if (typeof v === 'string') headers[k] = v;
    }

    const response = await fetch(`https://${this.httpDns}/event`, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `AppSync publish failed (${response.status}): ${text.slice(0, 200)}`,
      );
    }
  }
}
