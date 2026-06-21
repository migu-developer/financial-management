import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import type {
  ChatEventPayload,
  EventPublisherService,
} from '@services/chat/domain/services/event-publisher.service';
import type { TracerServiceImplementation } from '@services/shared/infrastructure/services/TracerServiceImp';

/**
 * Raised when AppSync rejects the publish (non-2xx) or the endpoint DNS is
 * not configured. Handlers catch this specific type to emit the
 * `ChatPublishFailed` metric before rethrowing so the SFN catch-all still
 * fires.
 */
export class AppSyncPublishError extends Error {}

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
    private readonly tracer?: TracerServiceImplementation,
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
      throw new AppSyncPublishError(
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

    const url = `https://${this.httpDns}/event`;

    // The native `fetch` would otherwise surface the raw AppSync DNS host as a
    // node in the X-Ray service map. Wrapping it in a `remote` subsegment named
    // "AppSyncEvents" gives a readable downstream node. Tracer is optional so
    // unit tests can call `publish` without an active segment.
    let response: Response;
    if (this.tracer) {
      let status = 0;
      response = await this.tracer.traceRemote(
        'AppSyncEvents',
        async () => {
          const res = await fetch(url, { method: 'POST', headers, body });
          status = res.status;
          return res;
        },
        {
          get annotations() {
            return { channel, httpStatus: status };
          },
          metadata: { eventType: payload.type },
        },
      );
    } else {
      response = await fetch(url, { method: 'POST', headers, body });
    }

    if (!response.ok) {
      const text = await response.text();
      throw new AppSyncPublishError(
        `AppSync publish failed (${response.status}): ${text.slice(0, 200)}`,
      );
    }
  }
}
