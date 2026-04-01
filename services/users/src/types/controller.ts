import type { Application } from '@services/users/presentation/application';
import type { Service } from './service';
import { MethodNotImplementedError } from '@packages/models/shared/utils/errors';

class BaseController {
  constructor(
    public readonly app: Application,
    public readonly service: Service,
  ) {}

  GET(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  POST(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  PUT(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  PATCH(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

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

export class Controller extends GetWrapper(
  PostWrapper(PutWrapper(PatchWrapper(DeleteWrapper(BaseController)))),
) {}
