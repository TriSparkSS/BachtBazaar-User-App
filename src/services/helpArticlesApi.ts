import { API_ENDPOINTS, HELP_ARTICLES_API_BASE_URL } from '../config/api';
import { apiRequest } from './apiClient';

export type HelpArticleItem = {
  id: string;
  slug: string;
  title: string;
  content?: string;
  summary?: string;
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
  const slug = pickString(raw.slug, raw.articleSlug, raw.article_slug) || '';
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

  const summary = pickString(raw.summary, raw.excerpt, raw.preview);
  const content = pickString(
    raw.content,
    raw.answer,
    raw.description,
    raw.body,
    raw.text,
    summary,
  );

  return {
    id,
    slug,
    title,
    content,
    summary,
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
    slug: string,
    token?: string | null,
  ): Promise<HelpArticleItem> {
    const trimmedSlug = String(slug ?? '').trim();
    if (!trimmedSlug) {
      throw new Error('Help article slug is required.');
    }

    const trimmedToken = String(token ?? '').trim();
    const response = await apiRequest<unknown>(
      API_ENDPOINTS.helpArticleBySlug(trimmedSlug),
      {
        method: 'GET',
        baseUrl: HELP_ARTICLES_API_BASE_URL,
        ...(trimmedToken ? { token: trimmedToken } : {}),
      },
    );

    return parseHelpArticleDetail(response);
  },
};
