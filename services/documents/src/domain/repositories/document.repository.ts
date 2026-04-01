import type { DocumentEntity } from '@services/documents/domain/entities/document.entity';

export interface DocumentRepository {
  findAll(): Promise<DocumentEntity[]>;
}
