import { ChatApiRepository } from './chat-api-repository';
import type { ApiClient } from './api-client';

function makeApi(): jest.Mocked<Pick<ApiClient, 'post'>> {
  return { post: jest.fn() };
}

describe('ChatApiRepository', () => {
  describe('sendMessage', () => {
    it('POSTs to /chat with content and unwraps the data envelope', async () => {
      const api = makeApi();
      api.post.mockResolvedValue({
        success: true,
        data: {
          status: 'processing',
          sessionId: 's1',
          messageId: 'm1',
          executionArn: 'arn1',
        },
      });

      const repo = new ChatApiRepository(api as unknown as ApiClient);
      const result = await repo.sendMessage({ content: 'Hola' });

      expect(api.post).toHaveBeenCalledWith('/chat', { content: 'Hola' });
      expect(result).toEqual({
        status: 'processing',
        sessionId: 's1',
        messageId: 'm1',
        executionArn: 'arn1',
      });
    });

    it('forwards sessionId when provided', async () => {
      const api = makeApi();
      api.post.mockResolvedValue({
        success: true,
        data: {
          status: 'processing',
          sessionId: 's1',
          messageId: 'm1',
          executionArn: 'arn1',
        },
      });

      const repo = new ChatApiRepository(api as unknown as ApiClient);
      await repo.sendMessage({ sessionId: 's1', content: 'Otra' });

      expect(api.post).toHaveBeenCalledWith('/chat', {
        sessionId: 's1',
        content: 'Otra',
      });
    });
  });

  describe('confirmExpense', () => {
    it('POSTs to /chat/confirm with the task token and decision', async () => {
      const api = makeApi();
      api.post.mockResolvedValue({
        success: true,
        data: { status: 'confirmed', messageId: 'm1' },
      });

      const repo = new ChatApiRepository(api as unknown as ApiClient);
      const result = await repo.confirmExpense({
        taskToken: 'tok',
        confirmed: true,
      });

      expect(api.post).toHaveBeenCalledWith('/chat/confirm', {
        taskToken: 'tok',
        confirmed: true,
      });
      expect(result).toEqual({ status: 'confirmed', messageId: 'm1' });
    });
  });
});
