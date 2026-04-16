import { apiRequest } from '../api';
import { apiClient } from '../api';
import type { AxiosError } from 'axios';
import type {
  ChatMessage,
  ChatConversation,
  ChatConversationListResponse,
  ChatCreateConversationPayload,
  ChatMarkReadPayload,
  ChatParticipant,
  ChatMessageListResponse,
  ChatProvider,
  ChatProviderCurrentUser,
  ChatSendMessagePayload,
} from './types';

type UnknownRecord = Record<string, unknown>;
type SenderRole = 'user' | 'admin';

const toIso = (value: unknown): string => {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  return new Date().toISOString();
};

const toNumber = (value: unknown, fallback = 0): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const toStringId = (value: unknown): string => {
  if (typeof value === 'string' && value) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return `conv_${Date.now()}`;
};

const getFirstNumber = (values: unknown[]): number => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
};

const getParticipantFromObject = (value: unknown): ChatParticipant | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as UnknownRecord;
  const id = getFirstNumber([record.id, record.userId, record.adminUserId, record.senderId]);
  if (id <= 0) {
    return null;
  }

  const explicitRole = typeof record.role === 'string' ? record.role.toLowerCase() : typeof record.type === 'string' ? record.type.toLowerCase() : '';
  const role: SenderRole | undefined = explicitRole === 'user' || explicitRole === 'admin' ? explicitRole : undefined;
  const name = [record.firstname, record.lastname].filter((part) => typeof part === 'string' && part.trim()).join(' ').trim();

  return {
    id,
    displayName: name || (role === 'user' ? 'You' : `Admin #${id}`),
    avatarUrl: typeof record.avatarUrl === 'string' ? record.avatarUrl : null,
    role,
  };
};

const getSenderObject = (raw: UnknownRecord): unknown =>
  raw.sender ?? raw.author ?? raw.createdBy ?? raw.user ?? raw.admin ?? raw.senderUser ?? raw.senderAdmin;

const inferSenderRole = (raw: UnknownRecord, currentUserId?: number): SenderRole => {
  const nestedSender = getParticipantFromObject(getSenderObject(raw));
  if (nestedSender?.role === 'user' || nestedSender?.role === 'admin') {
    return nestedSender.role;
  }

  if (nestedSender?.id && currentUserId && nestedSender.id === currentUserId) {
    return 'user';
  }

  const explicitType = typeof raw.senderType === 'string' ? raw.senderType.toLowerCase() : '';
  if (explicitType === 'user' || explicitType === 'admin') {
    return explicitType;
  }

  const userSenderId = getFirstNumber([
    raw.senderFrontendUser,
    raw.senderFrontendUserId,
    raw.frontendUserId,
    raw.frontendUser,
    raw.senderUserId,
    raw.userId,
    raw.senderId,
  ]);

  if (currentUserId && userSenderId === currentUserId) {
    return 'user';
  }

  const adminSenderId = getFirstNumber([
    raw.senderAdminUserId,
    raw.senderAdminUser,
    raw.adminUserId,
    raw.adminId,
  ]);

  if (adminSenderId > 0) {
    return 'admin';
  }

  if (currentUserId && userSenderId === currentUserId) {
    return 'user';
  }

  if (userSenderId > 0 && adminSenderId <= 0) {
    return 'user';
  }

  if (adminSenderId > 0) {
    return 'admin';
  }

  return currentUserId ? 'user' : 'admin';
};

const participantFromUser = (currentUser?: ChatProviderCurrentUser): ChatParticipant | null => {
  if (!currentUser) {
    return null;
  }

  return {
    id: currentUser.id,
    displayName: currentUser.displayName || 'You',
    avatarUrl: currentUser.avatarUrl,
    role: currentUser.role === 'admin' ? 'admin' : 'user',
  };
};

const participantFromAdmin = (adminUserId: number): ChatParticipant => ({
  id: adminUserId,
  displayName: adminUserId > 0 ? `Admin #${adminUserId}` : 'Admin',
  avatarUrl: null,
  role: 'admin',
});

const mapConversation = (raw: UnknownRecord, currentUser?: ChatProviderCurrentUser): ChatConversation => {
  const id = toStringId(raw.id ?? raw.documentId);
  const adminUserId = toNumber(raw.adminUserId, 0);
  const title = typeof raw.title === 'string' && raw.title.trim()
    ? raw.title
    : adminUserId > 0
      ? `Chat with Admin #${adminUserId}`
      : 'Chat';
  const updatedAt = toIso(raw.lastMessageAt ?? raw.updatedAt ?? raw.createdAt);
  const participants = [participantFromUser(currentUser), participantFromAdmin(adminUserId)].filter(Boolean) as ChatParticipant[];

  return {
    id,
    title,
    participants,
    lastMessage: null,
    unreadCount: toNumber(raw.unreadForUser ?? raw.unreadCount, 0),
    updatedAt,
  };
};

const mapMessage = (raw: UnknownRecord, currentUserId?: number, forceUserSender = false): ChatMessage => {
  const senderRole = forceUserSender ? 'user' : inferSenderRole(raw, currentUserId);
  const senderId = senderRole === 'user'
    ? getFirstNumber([
      raw.senderFrontendUser,
      raw.senderFrontendUserId,
      raw.frontendUserId,
      raw.frontendUser,
      raw.senderUserId,
      raw.userId,
      raw.senderId,
      currentUserId ?? 0,
    ])
    : getFirstNumber([
      raw.senderAdminUserId,
      raw.senderAdminUser,
      raw.adminUserId,
      raw.adminId,
    ]);

  return {
    id: toStringId(raw.id ?? raw.documentId),
    conversationId: toStringId(raw.conversation ?? raw.conversationId),
    senderType: senderRole,
    text: typeof raw.body === 'string' ? raw.body : typeof raw.text === 'string' ? raw.text : '',
    sender: {
      id: senderId,
      displayName: senderRole === 'user' ? 'You' : senderId > 0 ? `Admin #${senderId}` : 'Admin',
      avatarUrl: null,
      role: senderRole,
    },
    status: 'sent',
    createdAt: toIso(raw.createdAt),
    clientMessageId: typeof raw.clientMessageId === 'string' ? raw.clientMessageId : null,
  };
};

const extractArray = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (value && typeof value === 'object' && Array.isArray((value as UnknownRecord).data)) {
    return (value as UnknownRecord).data as T[];
  }
  return [];
};

export function createApiChatProvider(currentUser?: ChatProviderCurrentUser): ChatProvider {
  return {
    async listConversations(page = 1, pageSize = 20): Promise<ChatConversationListResponse> {
      const response = await apiRequest<unknown>('/api/chat/conversations', {
        params: {
          page,
          pageSize,
        },
      });

      const rows = extractArray<UnknownRecord>(response);
      const data = rows.map((row) => mapConversation(row, currentUser));

      return {
        data,
        meta: {
          pagination: {
            page,
            pageSize,
            total: data.length,
            pageCount: 1,
          },
        },
      };
    },

    async listAdmins() {
      try {
        const response = await apiClient.get<{ data?: Array<{ id: number; firstname?: string; lastname?: string; email?: string }> }>('/api/chat/admins');

        if (response.status !== 200) {
          console.error('[chat/admins] non-200 response', {
            status: response.status,
            payload: response.data,
          });
          throw new Error('Unable to load admins');
        }

        const rows = Array.isArray(response.data?.data) ? response.data.data : [];

        return {
          data: rows.map((admin) => {
            const fullName = `${admin.firstname || ''} ${admin.lastname || ''}`.trim();

            return {
              id: admin.id,
              displayName: fullName || admin.email || `Admin #${admin.id}`,
              avatarUrl: null,
              role: 'admin',
            };
          }),
        };
      } catch (error) {
        const axiosError = error as AxiosError<{ error?: unknown }>;
        console.error('[chat/admins] request failed', {
          status: axiosError.response?.status,
          payload: axiosError.response?.data,
        });
        throw new Error('Unable to load admins');
      }
    },

    async createConversation(payload: ChatCreateConversationPayload): Promise<{ data: ChatConversation }> {
      const response = await apiRequest<unknown>('/api/chat/conversations/start', {
        method: 'POST',
        body: {
          data: {
            adminUserId: payload.participantIds[0],
          },
        },
      });

      const row = (response && typeof response === 'object' && 'data' in (response as UnknownRecord)
        ? (response as UnknownRecord).data
        : response) as UnknownRecord;

      return { data: mapConversation(row || {}) };
    },

    async listMessages(conversationId: string, cursor?: string | null, pageSize = 30): Promise<ChatMessageListResponse> {
      const response = await apiRequest<unknown>(`/api/chat/conversations/${conversationId}/messages`, {
        params: {
          ...(cursor ? { cursor } : {}),
          pageSize,
        },
      });

      const rows = extractArray<UnknownRecord>(response);

      return {
        data: rows.map((row) => mapMessage(row, currentUser?.id)),
        meta: {
          nextCursor: null,
        },
      };
    },

    async sendMessage(conversationId: string, payload: ChatSendMessagePayload) {
      const response = await apiRequest<unknown>(`/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: {
          data: {
            body: payload.text,
            clientMessageId: payload.clientMessageId,
          },
        },
      });

      const row = (response && typeof response === 'object' && 'data' in (response as UnknownRecord)
        ? (response as UnknownRecord).data
        : response) as UnknownRecord;

      return {
        data: mapMessage({
          ...(row || {}),
          conversation: conversationId,
        }, currentUser?.id, true),
      };
    },

    async markRead(conversationId: string, payload: ChatMarkReadPayload) {
      try {
        return await apiRequest<{ data: { conversationId: string; unreadCount: number } }>(`/api/chat/conversations/${conversationId}/read`, {
          method: 'POST',
          body: payload,
        });
      } catch {
        return {
          data: {
            conversationId,
            unreadCount: 0,
          },
        };
      }
    },
  };
}
