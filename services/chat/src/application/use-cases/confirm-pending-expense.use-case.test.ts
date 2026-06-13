import { ConfirmPendingExpenseUseCase } from './confirm-pending-expense.use-case';
import type { ChatMessage } from '@services/chat/domain/entities/chat-message';
import type { ChatMessageRepository } from '@services/chat/domain/repositories/chat-message.repository';
import type { WorkflowCallbackService } from '@services/chat/domain/services/workflow-callback.service';

function makeMockMessageRepo(): jest.Mocked<ChatMessageRepository> {
  return {
    create: jest.fn(),
    findRecentBySession: jest.fn(),
    findPendingByTaskToken: jest.fn(),
    updateTaskTokenStatus: jest.fn(),
  };
}

function makeMockCallback(): jest.Mocked<WorkflowCallbackService> {
  return {
    resume: jest.fn(),
  };
}

const pendingMessage: ChatMessage = {
  id: 'msg-preview-1',
  session_id: 'session-1',
  role: 'assistant',
  content: 'Voy a registrar: Cena $45 USD. ¿Confirmás?',
  attachment_s3_key: null,
  attachment_type: null,
  expense_id: null,
  task_token: 'token-abc',
  task_token_status: 'pending',
  created_at: '2026-06-06T10:00:05Z',
  updated_at: '2026-06-06T10:00:05Z',
  created_by: 'system',
  modified_by: 'system',
};

const UID = 'uid-1';
const EMAIL = 'u@test.com';

describe('ConfirmPendingExpenseUseCase', () => {
  it('throws when taskToken is missing', async () => {
    const repo = makeMockMessageRepo();
    const callback = makeMockCallback();
    const useCase = new ConfirmPendingExpenseUseCase(repo, callback);

    await expect(
      useCase.execute({ taskToken: '', confirmed: true }, UID, EMAIL),
    ).rejects.toThrow();

    expect(repo.findPendingByTaskToken).not.toHaveBeenCalled();
    expect(callback.resume).not.toHaveBeenCalled();
  });

  it('throws Unauthorized when the token is not found for the user', async () => {
    const repo = makeMockMessageRepo();
    const callback = makeMockCallback();
    repo.findPendingByTaskToken.mockResolvedValue(null);
    const useCase = new ConfirmPendingExpenseUseCase(repo, callback);

    await expect(
      useCase.execute({ taskToken: 'token-xyz', confirmed: true }, UID, EMAIL),
    ).rejects.toThrow();

    expect(callback.resume).not.toHaveBeenCalled();
  });

  it('marks the message as confirmed and resumes the workflow with confirmed=true', async () => {
    const repo = makeMockMessageRepo();
    const callback = makeMockCallback();
    repo.findPendingByTaskToken.mockResolvedValue(pendingMessage);
    repo.updateTaskTokenStatus.mockResolvedValue({
      ...pendingMessage,
      task_token_status: 'confirmed',
    });
    const useCase = new ConfirmPendingExpenseUseCase(repo, callback);

    const result = await useCase.execute(
      { taskToken: 'token-abc', confirmed: true },
      UID,
      EMAIL,
    );

    expect(repo.updateTaskTokenStatus).toHaveBeenCalledWith(
      'msg-preview-1',
      UID,
      'confirmed',
      EMAIL,
    );
    expect(callback.resume).toHaveBeenCalledWith('token-abc', {
      confirmed: true,
    });
    expect(result.message.task_token_status).toBe('confirmed');
  });

  it('marks the message as cancelled and resumes with confirmed=false', async () => {
    const repo = makeMockMessageRepo();
    const callback = makeMockCallback();
    repo.findPendingByTaskToken.mockResolvedValue(pendingMessage);
    repo.updateTaskTokenStatus.mockResolvedValue({
      ...pendingMessage,
      task_token_status: 'cancelled',
    });
    const useCase = new ConfirmPendingExpenseUseCase(repo, callback);

    await useCase.execute(
      { taskToken: 'token-abc', confirmed: false },
      UID,
      EMAIL,
    );

    expect(repo.updateTaskTokenStatus).toHaveBeenCalledWith(
      'msg-preview-1',
      UID,
      'cancelled',
      EMAIL,
    );
    expect(callback.resume).toHaveBeenCalledWith('token-abc', {
      confirmed: false,
    });
  });

  it('updates the DB status before calling the workflow callback to avoid double-resume', async () => {
    const repo = makeMockMessageRepo();
    const callback = makeMockCallback();
    const callOrder: string[] = [];
    repo.findPendingByTaskToken.mockResolvedValue(pendingMessage);
    repo.updateTaskTokenStatus.mockImplementation(() => {
      callOrder.push('updateTaskTokenStatus');
      return Promise.resolve({
        ...pendingMessage,
        task_token_status: 'confirmed',
      });
    });
    callback.resume.mockImplementation(() => {
      callOrder.push('resume');
      return Promise.resolve();
    });

    const useCase = new ConfirmPendingExpenseUseCase(repo, callback);
    await useCase.execute(
      { taskToken: 'token-abc', confirmed: true },
      UID,
      EMAIL,
    );

    expect(callOrder).toEqual(['updateTaskTokenStatus', 'resume']);
  });
});
