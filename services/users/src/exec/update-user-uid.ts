import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PostgresDatabaseService } from '@services/shared/infrastructure/services/DatabaseServiceImp';
import { PostgresUserRepository } from '@services/users/infrastructure/repositories/postgres-user.repository';
import { UpdateUserUidUseCase } from '@services/users/application/use-cases/update-user-uid.use-case';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';

const logger = new LoggerServiceImplementation();
const EMAIL = process.env['USER_EMAIL'] ?? '';
const NEW_UID = process.env['NEW_UID'] ?? '';

async function main() {
  const dbService = new PostgresDatabaseService();
  try {
    const repo = new PostgresUserRepository(dbService);
    const useCase = new UpdateUserUidUseCase(repo);
    const result = await useCase.execute(EMAIL, NEW_UID, EMAIL);
    logger.info(`UID updated: ${JSON.stringify(result, null, 2)}`);
  } catch (error) {
    logger.error(`Failed: ${JSON.stringify(error)}`);
  } finally {
    await dbService.end();
  }
}

main()
  .then((result) => {
    logger.info(`Result: ${JSON.stringify(result, null, 2)}`);
  })
  .catch((error) => {
    logger.error(`Error: ${JSON.stringify(error, null, 2)}`);
  });
