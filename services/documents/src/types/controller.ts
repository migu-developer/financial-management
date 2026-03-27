import type { Application } from '@services/documents/presentation/application';
import type { Service } from './service';
import { MethodNotImplementedError } from '@packages/models/shared/utils/errors';

/**
 * Base controller class providing default HTTP method handlers for modules
 * Should be extended or wrapped to implement specific routing logic for each method
 */
class BaseController {
  /**
   * Creates a new BaseController instance
   * @param app - The application instance containing request context
   * @param service - The service instance for handling business logic
   */
  constructor(
    public readonly app: Application,
    public readonly service: Service,
  ) {}

  /**
   * Handles GET requests - should be overridden by subclasses
   * @returns Throws MethodNotImplementedError by default
   */
  GET(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  /**
   * Handles POST requests - should be overridden by subclasses
   * @returns Throws MethodNotImplementedError by default
   */
  POST(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  /**
   * Handles PUT requests - should be overridden by subclasses
   * @returns Throws MethodNotImplementedError by default
   */
  PUT(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  /**
   * Handles PATCH requests - should be overridden by subclasses
   * @returns Throws MethodNotImplementedError by default
   */
  PATCH(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  /**
   * Handles DELETE requests - should be overridden by subclasses
   * @returns Throws MethodNotImplementedError by default
   */
  DELETE(): Promise<Response> {
    throw new MethodNotImplementedError();
  }
}

const GetWrapper = (superclass: typeof BaseController) =>
  class extends superclass {
    override async GET(): Promise<Response> {
      return this.service.executeGET();
    }
  };

const PostWrapper = (superclass: typeof BaseController) =>
  class extends superclass {
    override async POST(): Promise<Response> {
      return this.service.executePOST();
    }
  };

const PutWrapper = (superclass: typeof BaseController) =>
  class extends superclass {
    override async PUT(): Promise<Response> {
      return this.service.executePUT();
    }
  };

const PatchWrapper = (superclass: typeof BaseController) =>
  class extends superclass {
    override async PATCH(): Promise<Response> {
      return this.service.executePATCH();
    }
  };

const DeleteWrapper = (superclass: typeof BaseController) =>
  class extends superclass {
    override async DELETE(): Promise<Response> {
      return this.service.executeDELETE();
    }
  };

/**
 * Main controller class that delegates all HTTP methods to the service layer
 * Extends BaseController with wrapper mixins for all HTTP methods
 * Used as the base class for all module controllers
 */
export class Controller extends GetWrapper(
  PostWrapper(PutWrapper(PatchWrapper(DeleteWrapper(BaseController)))),
) {}
