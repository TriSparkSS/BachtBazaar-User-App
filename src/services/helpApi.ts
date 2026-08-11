import { API_ENDPOINTS, HELP_API_BASE_URL } from '../config/api';
import { apiRequest } from './apiClient';

export type HelpTicketPriority = 'Low' | 'Medium' | 'High';

export type HelpTicketStatus = 'Open' | 'Closed' | 'Pending' | string;

export type CreateHelpTicketPayload = {
  subject: string;
  category: string;
  priority: HelpTicketPriority | string;
  description: string;
};

export type HelpTicketMessage = {
  id: string;
  message: string;
  senderType?: string;
  senderName?: string;
  createdAt?: string;
  isStaff?: boolean;
  raw: Record<string, unknown>;
};

export type HelpTicketListItem = {
  id: string;
  subject: string;
  category?: string;
  priority?: string;
  status?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  raw: Record<string, unknown>;
};

export type HelpTicketStatusTab = 'Open' | 'All' | 'Closed';

export type HelpTicketDetail = HelpTicketListItem & {
  messages: HelpTicketMessage[];
};

export const HELP_TICKET_CATEGORIES = [
  'Offers & Redemptions',
  'Account',
  'Delivery',
  'Payments',
  'Other',
] as const;

export const HELP_TICKET_PRIORITIES: HelpTicketPriority[] = [
  'Low',
  'Medium',
  'High',
];

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asArray = (value: unknown): unknown[] | null =>
  Array.isArray(value) ? value : null;

const pickString = (...candidates: unknown[]): string | undefined => {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return String(candidate);
    }
  }
  return undefined;
};

/** Normalize status strings for client-side tab filtering. */
export const normalizeTicketStatus = (status?: string | null): string =>
  String(status ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const CLOSED_STATUS_TOKENS = [
  'closed',
  'close',
  'resolved',
  'resolve',
  'done',
  'completed',
  'complete',
] as const;

const OPEN_STATUS_TOKENS = [
  'open',
  'pending',
  'in_progress',
  'inprogress',
  'progress',
  'waiting',
  'wait',
  'reopened',
  're_open',
  'active',
  'new',
] as const;

export const isClosedLikeTicket = (ticket: HelpTicketListItem): boolean => {
  if (ticket.resolvedAt || ticket.closedAt) {
    return true;
  }

  const raw = ticket.raw;
  const resolvedOrClosed = pickString(
    raw.resolvedAt,
    raw.resolved_at,
    raw.closedAt,
    raw.closed_at,
  );
  if (resolvedOrClosed) {
    return true;
  }

  const status = normalizeTicketStatus(ticket.status);
  if (!status) {
    return false;
  }

  return CLOSED_STATUS_TOKENS.some(
    token => status === token || status.includes(token),
  );
};

export const isOpenLikeTicket = (ticket: HelpTicketListItem): boolean => {
  if (isClosedLikeTicket(ticket)) {
    return false;
  }

  const status = normalizeTicketStatus(ticket.status);
  if (!status) {
    // Missing status → treat as open so it does not leak into Closed.
    return true;
  }

  if (
    OPEN_STATUS_TOKENS.some(token => status === token || status.includes(token))
  ) {
    return true;
  }

  // Anything not closed-like stays in Open (API may use custom labels).
  return true;
};

export const filterTicketsByTab = (
  tickets: HelpTicketListItem[],
  tab: HelpTicketStatusTab,
): HelpTicketListItem[] => {
  if (tab === 'All') {
    return tickets;
  }
  if (tab === 'Closed') {
    return tickets.filter(isClosedLikeTicket);
  }
  return tickets.filter(isOpenLikeTicket);
};

const extractList = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const root = asRecord(payload);
  if (!root) {
    return [];
  }

  const candidates = [
    root.data,
    root.tickets,
    root.items,
    root.results,
    root.myTickets,
    root.my_tickets,
    asRecord(root.data)?.tickets,
    asRecord(root.data)?.items,
    asRecord(root.data)?.results,
    asRecord(root.data)?.data,
  ];

  for (const candidate of candidates) {
    const list = asArray(candidate);
    if (list) {
      return list;
    }
  }

  return [];
};

const extractTicketRecord = (payload: unknown): Record<string, unknown> | null => {
  const root = asRecord(payload);
  if (!root) {
    return null;
  }

  const nested =
    asRecord(root.data) ||
    asRecord(root.ticket) ||
    asRecord(asRecord(root.data)?.ticket) ||
    asRecord(asRecord(root.data)?.data);

  if (nested && (nested._id || nested.id || nested.ticketId || nested.subject)) {
    return nested;
  }

  if (root._id || root.id || root.ticketId || root.subject) {
    return root;
  }

  return nested;
};

const extractMessages = (ticket: Record<string, unknown>): unknown[] => {
  const candidates = [
    ticket.messages,
    ticket.replies,
    ticket.thread,
    ticket.conversation,
    ticket.comments,
    asRecord(ticket.data)?.messages,
    asRecord(ticket.data)?.replies,
  ];

  for (const candidate of candidates) {
    const list = asArray(candidate);
    if (list) {
      return list;
    }
  }

  return [];
};

const parseMessage = (
  item: unknown,
  index: number,
): HelpTicketMessage | null => {
  const record = asRecord(item);
  if (!record) {
    if (typeof item === 'string' && item.trim()) {
      return {
        id: `msg-${index}`,
        message: item.trim(),
        raw: { message: item.trim() },
      };
    }
    return null;
  }

  const message = pickString(
    record.message,
    record.body,
    record.content,
    record.text,
    record.description,
    record.reply,
  );

  if (!message) {
    return null;
  }

  const senderType = pickString(
    record.senderType,
    record.sender_type,
    record.role,
    record.from,
    record.authorType,
    record.author_type,
  );
  const senderName = pickString(
    record.senderName,
    record.sender_name,
    record.authorName,
    record.author_name,
    record.name,
    record.userName,
    asRecord(record.sender)?.name,
    asRecord(record.user)?.name,
    asRecord(record.admin)?.name,
  );

  const normalizedSender = (senderType || senderName || '').toLowerCase();
  const isStaff =
    record.isStaff === true ||
    record.is_staff === true ||
    record.isAdmin === true ||
    normalizedSender.includes('admin') ||
    normalizedSender.includes('support') ||
    normalizedSender.includes('staff') ||
    normalizedSender.includes('agent');

  return {
    id:
      pickString(record._id, record.id, record.messageId, record.replyId) ||
      `msg-${index}`,
    message,
    senderType,
    senderName,
    createdAt: pickString(
      record.createdAt,
      record.created_at,
      record.updatedAt,
      record.timestamp,
      record.date,
    ),
    isStaff,
    raw: record,
  };
};

const parseTicketListItem = (
  item: unknown,
  index: number,
): HelpTicketListItem | null => {
  const record = asRecord(item);
  if (!record) {
    return null;
  }

  const id = pickString(
    record._id,
    record.id,
    record.ticketId,
    record.ticket_id,
  );
  if (!id) {
    return null;
  }

  return {
    id,
    subject:
      pickString(record.subject, record.title, record.topic) ||
      `Ticket ${index + 1}`,
    category: pickString(record.category, record.type, record.issueType),
    priority: pickString(record.priority, record.urgency),
    status: pickString(record.status, record.state),
    description: pickString(
      record.description,
      record.message,
      record.body,
      record.details,
    ),
    createdAt: pickString(
      record.createdAt,
      record.created_at,
      record.openedAt,
      record.date,
    ),
    updatedAt: pickString(
      record.updatedAt,
      record.updated_at,
      record.lastReplyAt,
    ),
    resolvedAt: pickString(record.resolvedAt, record.resolved_at),
    closedAt: pickString(record.closedAt, record.closed_at),
    raw: record,
  };
};

const parseTicketDetail = (payload: unknown): HelpTicketDetail => {
  const record = extractTicketRecord(payload);
  if (!record) {
    throw new Error('Ticket detail was empty or unrecognized.');
  }

  const base = parseTicketListItem(record, 0);
  if (!base) {
    throw new Error('Ticket detail was missing an id.');
  }

  const descriptionMessage = base.description
    ? ({
        id: `${base.id}-description`,
        message: base.description,
        senderType: 'user',
        senderName: 'You',
        createdAt: base.createdAt,
        isStaff: false,
        raw: { message: base.description },
      } satisfies HelpTicketMessage)
    : null;

  const replies = extractMessages(record)
    .map((item, index) => parseMessage(item, index))
    .filter((item): item is HelpTicketMessage => Boolean(item));

  const messages =
    descriptionMessage &&
    !replies.some(
      reply =>
        reply.message.trim().toLowerCase() ===
        descriptionMessage.message.trim().toLowerCase(),
    )
      ? [descriptionMessage, ...replies]
      : replies.length > 0
        ? replies
        : descriptionMessage
          ? [descriptionMessage]
          : [];

  return {
    ...base,
    messages,
  };
};

const extractCreatedTicketId = (payload: unknown): string => {
  const record = extractTicketRecord(payload);
  const id = pickString(
    record?._id,
    record?.id,
    record?.ticketId,
    record?.ticket_id,
    asRecord(payload)?.ticketId,
    asRecord(payload)?.id,
  );

  if (!id) {
    throw new Error('Ticket was created but no ticket id was returned.');
  }

  return id;
};

export const helpApi = {
  async createTicket(
    payload: CreateHelpTicketPayload,
    token: string,
  ): Promise<{ ticketId: string; raw: unknown }> {
    const trimmed = String(token ?? '').trim();
    if (!trimmed) {
      throw new Error('Login required to create a support ticket.');
    }

    const subject = String(payload.subject ?? '').trim();
    const category = String(payload.category ?? '').trim();
    const priority = String(payload.priority ?? '').trim();
    const description = String(payload.description ?? '').trim();

    if (!subject) {
      throw new Error('Subject is required.');
    }
    if (!category) {
      throw new Error('Category is required.');
    }
    if (!priority) {
      throw new Error('Priority is required.');
    }
    if (!description) {
      throw new Error('Description is required.');
    }

    const response = await apiRequest<unknown>(API_ENDPOINTS.helpCreateTicket, {
      method: 'POST',
      token: trimmed,
      baseUrl: HELP_API_BASE_URL,
      body: { subject, category, priority, description },
    });

    return {
      ticketId: extractCreatedTicketId(response),
      raw: response,
    };
  },

  async replyTicket(
    ticketId: string,
    message: string,
    token: string,
  ): Promise<unknown> {
    const trimmedToken = String(token ?? '').trim();
    const trimmedId = String(ticketId ?? '').trim();
    const trimmedMessage = String(message ?? '').trim();

    if (!trimmedToken) {
      throw new Error('Login required to reply to a ticket.');
    }
    if (!trimmedId) {
      throw new Error('Ticket id is required.');
    }
    if (!trimmedMessage) {
      throw new Error('Reply message is required.');
    }

    return apiRequest<unknown>(API_ENDPOINTS.helpTicketReply(trimmedId), {
      method: 'POST',
      token: trimmedToken,
      baseUrl: HELP_API_BASE_URL,
      body: { message: trimmedMessage },
    });
  },

  async fetchMyTickets(
    token: string,
    status?: string,
  ): Promise<HelpTicketListItem[]> {
    const trimmed = String(token ?? '').trim();
    if (!trimmed) {
      throw new Error('Login required to load support tickets.');
    }

    const statusFilter =
      status && status.trim() && status.trim().toLowerCase() !== 'all'
        ? status.trim()
        : undefined;

    const response = await apiRequest<unknown>(
      API_ENDPOINTS.helpMyTickets(statusFilter),
      {
        method: 'GET',
        token: trimmed,
        baseUrl: HELP_API_BASE_URL,
      },
    );

    return extractList(response)
      .map((item, index) => parseTicketListItem(item, index))
      .filter((item): item is HelpTicketListItem => Boolean(item));
  },

  async fetchTicketDetail(
    ticketId: string,
    token: string,
  ): Promise<HelpTicketDetail> {
    const trimmedToken = String(token ?? '').trim();
    const trimmedId = String(ticketId ?? '').trim();

    if (!trimmedToken) {
      throw new Error('Login required to load ticket detail.');
    }
    if (!trimmedId) {
      throw new Error('Ticket id is required.');
    }

    const response = await apiRequest<unknown>(
      API_ENDPOINTS.helpTicketDetail(trimmedId),
      {
        method: 'GET',
        token: trimmedToken,
        baseUrl: HELP_API_BASE_URL,
      },
    );

    return parseTicketDetail(response);
  },
};
