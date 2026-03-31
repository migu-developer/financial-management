import type { Application } from '@services/users/presentation/application';
import { Controller } from '@services/users/types/controller';
import { UsersService, UserService } from './service';
import { MethodNotImplementedError } from '@packages/models/shared/utils/errors';

export class UsersController extends Controller {
  constructor(public override readonly app: Application) {
    const service = new UsersService(app);
    super(app, service);
  }

  override async POST(): Promise<Response> {
    return this.service.executePOST();
  }

  override GET(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  override PUT(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  override PATCH(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  override DELETE(): Promise<Response> {
    throw new MethodNotImplementedError();
  }
}

export class UserController extends Controller {
  constructor(public override readonly app: Application) {
    const service = new UserService(app);
    super(app, service);
  }

  override async GET(): Promise<Response> {
    return this.service.executeGET();
  }

  override async PATCH(): Promise<Response> {
    return this.service.executePATCH();
  }

  override POST(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  override PUT(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  override DELETE(): Promise<Response> {
    throw new MethodNotImplementedError();
  }
}
