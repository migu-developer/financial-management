import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PostgresDatabaseService } from '@services/shared/infrastructure/services/DatabaseServiceImp';
import { PostgresUserRepository } from '@services/users/infrastructure/repositories/postgres-user.repository';
import { GetUserByEmailUseCase } from '@services/users/application/use-cases/get-user-by-email.use-case';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';

const logger = new LoggerServiceImplementation();
const EMAIL = process.env['USER_EMAIL']!;

async function main() {
  const dbService = new PostgresDatabaseService();
  try {
    const repo = new PostgresUserRepository(dbService);
    const useCase = new GetUserByEmailUseCase(repo);
    const result = await useCase.execute(EMAIL);
    if (result) {
      logger.info(`User found: ${JSON.stringify(result, null, 2)}`);
    } else {
      logger.info(`No user found with email: ${EMAIL}`);
    }
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
