import type { Application } from '@services/chat/presentation/application';
import { Controller } from '@services/chat/types/controller';
import {
  ChatService,
  ChatConfirmService,
  ChatSessionsService,
  ChatSessionMessagesService,
} from './service';
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

/**
 * Controller for `GET /chat/sessions`. Lists the user's chat sessions
 * for the sidebar; only GET is supported.
 */
export class ChatSessionsController extends Controller {
  constructor(public override readonly app: Application) {
    const service = new ChatSessionsService(app);
    super(app, service);
  }

  override async GET(): Promise<Response> {
    return this.service.executeGET();
  }

  override POST(): Promise<Response> {
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

/**
 * Controller for `GET /chat/sessions/{id}/messages`. Returns a session's
 * messages so the client can restore the conversation; only GET supported.
 */
export class ChatSessionMessagesController extends Controller {
  constructor(public override readonly app: Application) {
    const service = new ChatSessionMessagesService(app);
    super(app, service);
  }

  override async GET(): Promise<Response> {
    return this.service.executeGET();
  }

  override POST(): Promise<Response> {
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
