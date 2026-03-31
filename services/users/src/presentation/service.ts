import { Service } from '@services/users/types/service';
import type { Application } from '@services/users/presentation/application';
import type {
  CreateUserInput,
  PatchUserInput,
} from '@packages/models/users/types';
import { CreateUserUseCase } from '@services/users/application/use-cases/create-user.use-case';
import { GetUserByUidUseCase } from '@services/users/application/use-cases/get-user-by-uid.use-case';
import { PatchUserUseCase } from '@services/users/application/use-cases/patch-user.use-case';
import { PostgresUserRepository } from '@services/users/infrastructure/repositories/postgres-user.repository';
import { HttpCode } from '@packages/models/shared/utils/http-code';

export class UsersService extends Service {
  constructor(public readonly app: Application) {
    super(app);
  }

  override async executePOST(): Promise<Response> {
    this.app.logger.info('Executing users POST request', UsersService.name);
    const input = JSON.parse(this.app.event.body!) as CreateUserInput;
    const repository = new PostgresUserRepository(this.app.dbService);
    const useCase = new CreateUserUseCase(repository);
    const user = await useCase.execute(input, input.email);
    return new Response(JSON.stringify({ success: true, data: user }), {
      status: HttpCode.SUCCESS,
    });
  }
}

export class UserService extends Service {
  constructor(public readonly app: Application) {
    super(app);
  }

  override async executeGET(): Promise<Response> {
    this.app.logger.info('Executing user GET request', UserService.name);
    const uid = this.app.event.pathParameters?.['id'] ?? '';
    const repository = new PostgresUserRepository(this.app.dbService);
    const useCase = new GetUserByUidUseCase(repository);
    const user = await useCase.execute(uid);
    return new Response(JSON.stringify({ success: true, data: user }), {
      status: HttpCode.SUCCESS,
    });
  }

  override async executePATCH(): Promise<Response> {
    this.app.logger.info('Executing user PATCH request', UserService.name);
    const uid = this.app.event.pathParameters?.['id'] ?? '';
    const input = JSON.parse(this.app.event.body!) as PatchUserInput;
    const repository = new PostgresUserRepository(this.app.dbService);
    const useCase = new PatchUserUseCase(repository);
    const user = await useCase.execute(uid, input, this.app.user.email);
    return new Response(JSON.stringify({ success: true, data: user }), {
      status: HttpCode.SUCCESS,
    });
  }
}
