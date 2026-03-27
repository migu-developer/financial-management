import type { Application } from '@services/expenses/presentation/application';
import { ServiceNotImplementedError } from '@packages/models/shared/utils/errors';

/**
 * Base service class for agents, providing default HTTP method handlers
 * Should be extended to implement specific business logic for each method
 */
class BaseService {
  /**
   * Creates a new BaseService instance
   * @param application - The application instance containing request context
   */
  constructor(public readonly application: Application) {}

  /**
   * Handles GET requests - should be overridden by subclasses
   * @returns Throws ServiceNotImplementedError by default
   */
  executeGET(): Promise<Response> {
    throw new ServiceNotImplementedError();
  }

  /**
   * Handles POST requests - should be overridden by subclasses
   * @returns Throws ServiceNotImplementedError by default
   */
  executePOST(): Promise<Response> {
    throw new ServiceNotImplementedError();
  }

  /**
   * Handles PUT requests - should be overridden by subclasses
   * @returns Throws ServiceNotImplementedError by default
   */
  executePUT(): Promise<Response> {
    throw new ServiceNotImplementedError();
  }

  /**
   * Handles PATCH requests - should be overridden by subclasses
   * @returns Throws ServiceNotImplementedError by default
   */
  executePATCH(): Promise<Response> {
    throw new ServiceNotImplementedError();
  }

  /**
   * Handles DELETE requests - should be overridden by subclasses
   * @returns Throws ServiceNotImplementedError by default
   */
  executeDELETE(): Promise<Response> {
    throw new ServiceNotImplementedError();
  }
}

/**
 * Wrapper mixin that overrides the executeGET method to delegate to service
 * Used to extend BaseService with GET method delegation
 */
const ExecuteGETWrapper = (superclass: typeof BaseService) =>
  class extends superclass {
    override async executeGET(): Promise<Response> {
      return Promise.resolve(new Response('Not implemented'));
    }
  };

const ExecutePOSTWrapper = (superclass: typeof BaseService) =>
  class extends superclass {
    override async executePOST(): Promise<Response> {
      return Promise.resolve(new Response('Not implemented'));
    }
  };

const ExecutePUTWrapper = (superclass: typeof BaseService) =>
  class extends superclass {
    override async executePUT(): Promise<Response> {
      return Promise.resolve(new Response('Not implemented'));
    }
  };

const ExecutePATCHWrapper = (superclass: typeof BaseService) =>
  class extends superclass {
    override async executePATCH(): Promise<Response> {
      return Promise.resolve(new Response('Not implemented'));
    }
  };

const ExecuteDELETEWrapper = (superclass: typeof BaseService) =>
  class extends superclass {
    override async executeDELETE(): Promise<Response> {
      return Promise.resolve(new Response('Not implemented'));
    }
  };

/**
 * Main service class that provides default HTTP method implementations
 * Extends BaseService with wrapper mixins for all HTTP methods
 * Used as the base class for all module services
 */
export class Service extends ExecuteGETWrapper(
  ExecutePOSTWrapper(
    ExecutePUTWrapper(ExecutePATCHWrapper(ExecuteDELETEWrapper(BaseService))),
  ),
) {}
