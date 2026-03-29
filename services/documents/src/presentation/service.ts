import { Service } from '@services/documents/types/service';
import type { Application } from '@services/documents/presentation/application';
import { GetDocumentsUseCase } from '@services/documents/application/use-cases/get-documents.use-case';
import { PostgresDocumentRepository } from '@services/documents/infrastructure/repositories/postgres-document.repository';
import { HttpCode } from '@packages/models/shared/utils/http-code';

export class DocumentsService extends Service {
  constructor(public readonly app: Application) {
    super(app);
  }

  override async executeGET(): Promise<Response> {
    this.app.logger.info(
      'Executing documents GET request',
      DocumentsService.name,
    );

    const repository = new PostgresDocumentRepository(this.app.dbService);
    const useCase = new GetDocumentsUseCase(repository);
    const documents = await useCase.execute();

    return new Response(JSON.stringify({ success: true, data: documents }), {
      status: HttpCode.SUCCESS,
    });
  }
}
