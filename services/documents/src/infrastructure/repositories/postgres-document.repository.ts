import { Tracer } from '@aws-lambda-powertools/tracer';
import type { DocumentEntity } from '@services/documents/domain/entities/document.entity';
import type { DocumentRepository } from '@services/documents/domain/repositories/document.repository';
import type { DatabaseService } from '@services/shared/domain/services/database';

const tracer = new Tracer({ serviceName: 'documents-repository' });

export class PostgresDocumentRepository implements DocumentRepository {
  constructor(private readonly dbService: DatabaseService) {}

  @tracer.captureMethod({ subSegmentName: 'Document:findAll' })
  async findAll(): Promise<DocumentEntity[]> {
    return this.dbService.queryReadOnly<DocumentEntity>(
      'SELECT id, name FROM financial_management.documents ORDER BY name ASC',
    );
  }
}
