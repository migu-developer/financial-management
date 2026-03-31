import type { Application } from '@services/users/presentation/application';
import { ServiceNotImplementedError } from '@packages/models/shared/utils/errors';

class BaseService {
  constructor(public readonly application: Application) {}

  executeGET(): Promise<Response> {
    throw new ServiceNotImplementedError();
  }

  executePOST(): Promise<Response> {
    throw new ServiceNotImplementedError();
  }

  executePUT(): Promise<Response> {
    throw new ServiceNotImplementedError();
  }

  executePATCH(): Promise<Response> {
    throw new ServiceNotImplementedError();
  }

  executeDELETE(): Promise<Response> {
    throw new ServiceNotImplementedError();
  }
}

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

export class Service extends ExecuteGETWrapper(
  ExecutePOSTWrapper(
    ExecutePUTWrapper(ExecutePATCHWrapper(ExecuteDELETEWrapper(BaseService))),
  ),
) {}
