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
      return super.executeGET();
    }
  };

const ExecutePOSTWrapper = (superclass: typeof BaseService) =>
  class extends superclass {
    override async executePOST(): Promise<Response> {
      return super.executePOST();
    }
  };

const ExecutePUTWrapper = (superclass: typeof BaseService) =>
  class extends superclass {
    override async executePUT(): Promise<Response> {
      return super.executePUT();
    }
  };

const ExecutePATCHWrapper = (superclass: typeof BaseService) =>
  class extends superclass {
    override async executePATCH(): Promise<Response> {
      return super.executePATCH();
    }
  };

const ExecuteDELETEWrapper = (superclass: typeof BaseService) =>
  class extends superclass {
    override async executeDELETE(): Promise<Response> {
      return super.executeDELETE();
    }
  };

export class Service extends ExecuteGETWrapper(
  ExecutePOSTWrapper(
    ExecutePUTWrapper(ExecutePATCHWrapper(ExecuteDELETEWrapper(BaseService))),
  ),
) {}
