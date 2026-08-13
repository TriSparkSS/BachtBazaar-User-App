import { API_ENDPOINTS, HELP_ARTICLES_API_BASE_URL } from '../config/api';
import { apiRequest } from './apiClient';

export type HelpArticleItem = {
  id: string;
  title: string;
  content?: string;
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
    asArray(root.articles) ||
    asArray(root.helpArticles) ||
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
      asArray(nestedData.articles) ||
      asArray(nestedData.helpArticles) ||
      asArray(nestedData.items) ||
      asArray(nestedData.results) ||
      []
    );
  }

  return [];
};

const parseHelpArticleItem = (
  value: unknown,
  index: number,
): HelpArticleItem | null => {
  const raw = asRecord(value);
  if (!raw) {
    return null;
  }

  const id =
    pickString(raw._id, raw.id, raw.articleId, raw.article_id) ||
    `help-article-${index}`;
  const title = pickString(
    raw.title,
    raw.headline,
    raw.question,
    raw.name,
    raw.subject,
  );
  if (!title) {
    return null;
  }

  const content = pickString(
    raw.content,
    raw.answer,
    raw.description,
    raw.body,
    raw.text,
  );

  return {
    id,
    title,
    content,
    category: pickString(raw.category, raw.targetAudience, raw.audience),
    raw,
  };
};

const parseHelpArticleDetail = (payload: unknown): HelpArticleItem => {
  const root = asRecord(payload);
  const data = asRecord(root?.data) || root || asRecord(payload);

  const parsed = parseHelpArticleItem(data ?? payload, 0);
  if (!parsed) {
    throw new Error('Help article detail response was empty or invalid.');
  }
  return parsed;
};

export const helpArticlesApi = {
  async fetchUserHelpArticles(
    token?: string | null,
  ): Promise<HelpArticleItem[]> {
    const trimmed = String(token ?? '').trim();
    const response = await apiRequest<unknown>(API_ENDPOINTS.helpArticlesUser, {
      method: 'GET',
      baseUrl: HELP_ARTICLES_API_BASE_URL,
      ...(trimmed ? { token: trimmed } : {}),
    });

    return extractList(response)
      .map((item, index) => parseHelpArticleItem(item, index))
      .filter((item): item is HelpArticleItem => Boolean(item));
  },

  async fetchHelpArticleDetail(
    articleId: string,
    token?: string | null,
  ): Promise<HelpArticleItem> {
    const trimmedId = String(articleId ?? '').trim();
    if (!trimmedId) {
      throw new Error('Help article id is required.');
    }

    const trimmedToken = String(token ?? '').trim();
    const response = await apiRequest<unknown>(
      API_ENDPOINTS.helpArticleDetail(trimmedId),
      {
        method: 'GET',
        baseUrl: HELP_ARTICLES_API_BASE_URL,
        ...(trimmedToken ? { token: trimmedToken } : {}),
      },
    );

    return parseHelpArticleDetail(response);
  },
};
