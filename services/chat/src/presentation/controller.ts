import type { Application } from '@services/chat/presentation/application';
import { Controller } from '@services/chat/types/controller';
import { ChatService, ChatConfirmService } from './service';
import { MethodNotImplementedError } from '@packages/models/shared/utils/errors';

/**
 * Controller for `POST /chat`. Only POST is supported; all other methods
 * throw `MethodNotImplementedError`.
 */
export class ChatController extends Controller {
  constructor(public override readonly app: Application) {
    const service = new ChatService(app);
    super(app, service);
  }

  override GET(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  override async POST(): Promise<Response> {
    return this.service.executePOST();
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

/**
 * Controller for `POST /chat/confirm`. Handles the Human-in-the-Loop
 * callback that resumes a paused Step Function execution.
 */
export class ChatConfirmController extends Controller {
  constructor(public override readonly app: Application) {
    const service = new ChatConfirmService(app);
    super(app, service);
  }

  override GET(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  override async POST(): Promise<Response> {
    return this.service.executePOST();
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
