import { API_ENDPOINTS, FAQ_API_BASE_URL } from '../config/api';
import { apiRequest } from './apiClient';

export type FaqItem = {
  id: string;
  question: string;
  answer?: string;
  videoUrl?: string;
  category?: string;
  raw: Record<string, unknown>;
};

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

const extractList = (payload: unknown): unknown[] => {
  const root = asRecord(payload);
  if (!root) {
    return asArray(payload) ?? [];
  }

  const direct =
    asArray(root.data) ||
    asArray(root.faqs) ||
    asArray(root.items) ||
    asArray(root.results) ||
    asArray(root.list);

  if (direct) {
    return direct;
  }

  const nestedData = asRecord(root.data);
  if (nestedData) {
    return (
      asArray(nestedData.data) ||
      asArray(nestedData.faqs) ||
      asArray(nestedData.items) ||
      asArray(nestedData.results) ||
      []
    );
  }

  return [];
};

const parseFaqItem = (value: unknown, index: number): FaqItem | null => {
  const raw = asRecord(value);
  if (!raw) {
    return null;
  }

  const id =
    pickString(raw._id, raw.id, raw.faqId, raw.faq_id) || `faq-${index}`;
  const question = pickString(
    raw.question,
    raw.title,
    raw.headline,
    raw.name,
    raw.subject,
  );
  if (!question) {
    return null;
  }

  const answer = pickString(
    raw.answer,
    raw.description,
    raw.content,
    raw.body,
    raw.text,
  );

  return {
    id,
    question,
    answer,
    videoUrl: pickString(raw.videoUrl, raw.video_url, raw.video),
    category: pickString(raw.category, raw.targetAudience, raw.audience),
    raw,
  };
};

const parseFaqDetail = (payload: unknown): FaqItem => {
  const root = asRecord(payload);
  const data = asRecord(root?.data) || root || asRecord(payload);

  const parsed = parseFaqItem(data ?? payload, 0);
  if (!parsed) {
    throw new Error('FAQ detail response was empty or invalid.');
  }
  return parsed;
};

export const faqApi = {
  async fetchUserFaqs(token?: string | null): Promise<FaqItem[]> {
    const trimmed = String(token ?? '').trim();
    const response = await apiRequest<unknown>(API_ENDPOINTS.faqsUser, {
      method: 'GET',
      baseUrl: FAQ_API_BASE_URL,
      ...(trimmed ? { token: trimmed } : {}),
    });

    return extractList(response)
      .map((item, index) => parseFaqItem(item, index))
      .filter((item): item is FaqItem => Boolean(item));
  },

  async fetchFaqDetail(
    faqId: string,
    token?: string | null,
  ): Promise<FaqItem> {
    const trimmedId = String(faqId ?? '').trim();
    if (!trimmedId) {
      throw new Error('FAQ id is required.');
    }

    const trimmedToken = String(token ?? '').trim();
    const response = await apiRequest<unknown>(
      API_ENDPOINTS.faqDetail(trimmedId),
      {
        method: 'GET',
        baseUrl: FAQ_API_BASE_URL,
        ...(trimmedToken ? { token: trimmedToken } : {}),
      },
    );

    return parseFaqDetail(response);
  },
};
