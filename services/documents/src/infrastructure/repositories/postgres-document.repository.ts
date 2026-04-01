import type { DocumentEntity } from '@services/documents/domain/entities/document.entity';
import type { DocumentRepository } from '@services/documents/domain/repositories/document.repository';
import type { DatabaseService } from '@services/shared/domain/services/database';

export class PostgresDocumentRepository implements DocumentRepository {
  constructor(private readonly dbService: DatabaseService) {}

  async findAll(): Promise<DocumentEntity[]> {
    return this.dbService.queryReadOnly<DocumentEntity>(
      'SELECT id, name FROM financial_management.documents ORDER BY name ASC',
    );
  }
}
