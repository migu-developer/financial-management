import type { DocumentEntity } from '@services/documents/domain/entities/document.entity';
import type { DocumentRepository } from '@services/documents/domain/repositories/document.repository';

export class GetDocumentsUseCase {
  constructor(private readonly repository: DocumentRepository) {}

  async execute(): Promise<DocumentEntity[]> {
    return this.repository.findAll();
  }
}
