import type { ScheduledEvent } from '@services/shared/domain/interfaces/eventbridge';
import { handler } from '@services/currencies/handlers/update-rates';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';

const event: ScheduledEvent = {
  version: '0',
  id: 'local-test',
  'detail-type': 'Scheduled Event',
  source: 'local.test',
  account: '000000000000',
  time: new Date().toISOString(),
  region: 'us-east-1',
  resources: [],
  detail: {},
};

handler(event)
  .then((response) => {
    const logger = new LoggerServiceImplementation();
    logger.info(JSON.stringify(response, null, 2));
  })
  .catch((error: unknown) => {
    const logger = new LoggerServiceImplementation();
    logger.error(JSON.stringify(error, null, 2));
  });
