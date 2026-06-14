import { ChatApiRepository } from './chat-api-repository';
import type { ApiClient } from './api-client';

function makeApi(): jest.Mocked<Pick<ApiClient, 'post' | 'get'>> {
  return { post: jest.fn(), get: jest.fn() };
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

  describe('listSessions', () => {
    it('GETs /chat/sessions and maps snake_case → camelCase', async () => {
      const api = makeApi();
      api.get.mockResolvedValue({
        success: true,
        data: {
          sessions: [
            {
              id: 's1',
              started_at: '2026-06-01T10:00:00Z',
              last_message_at: '2026-06-12T10:00:00Z',
              preview: 'Gasté 50',
              message_count: 4,
            },
          ],
        },
      });

      const repo = new ChatApiRepository(api as unknown as ApiClient);
      const result = await repo.listSessions();

      expect(api.get).toHaveBeenCalledWith('/chat/sessions');
      expect(result).toEqual([
        {
          id: 's1',
          startedAt: '2026-06-01T10:00:00Z',
          lastMessageAt: '2026-06-12T10:00:00Z',
          preview: 'Gasté 50',
          messageCount: 4,
        },
      ]);
    });
  });

  describe('getSessionMessages', () => {
    it('GETs the session messages route and maps the rows', async () => {
      const api = makeApi();
      api.get.mockResolvedValue({
        success: true,
        data: {
          sessionId: 's1',
          messages: [
            {
              id: 'm1',
              role: 'user',
              content: 'Hola',
              task_token: null,
              task_token_status: null,
              created_at: '2026-06-01T10:00:01Z',
            },
            {
              id: 'm2',
              role: 'assistant',
              content: '¿Confirmás?',
              task_token: 'tok-1',
              task_token_status: 'pending',
              created_at: '2026-06-01T10:00:02Z',
            },
          ],
        },
      });

      const repo = new ChatApiRepository(api as unknown as ApiClient);
      const result = await repo.getSessionMessages('s1');

      expect(api.get).toHaveBeenCalledWith('/chat/sessions/s1/messages');
      expect(result).toEqual([
        {
          id: 'm1',
          role: 'user',
          content: 'Hola',
          taskToken: null,
          taskTokenStatus: null,
          createdAt: '2026-06-01T10:00:01Z',
        },
        {
          id: 'm2',
          role: 'assistant',
          content: '¿Confirmás?',
          taskToken: 'tok-1',
          taskTokenStatus: 'pending',
          createdAt: '2026-06-01T10:00:02Z',
        },
      ]);
    });
  });
});
