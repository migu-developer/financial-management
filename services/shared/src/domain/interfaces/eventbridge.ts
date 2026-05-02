export interface EventBridgeEvent<TDetail = Record<string, unknown>> {
  version: string;
  id: string;
  'detail-type': string;
  source: string;
  account: string;
  time: string;
  region: string;
  resources: string[];
  detail: TDetail;
}

export type ScheduledEvent = EventBridgeEvent<Record<string, never>>;
