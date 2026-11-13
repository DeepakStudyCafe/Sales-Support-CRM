import { PaginationMeta } from './response';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function getPaginationParams(query: Record<string, unknown>): PaginationParams {
  const rawPage = typeof query.page === 'string' ? parseInt(query.page, 10) : 1;
  const rawLimit = typeof query.limit === 'string' ? parseInt(query.limit, 10) : 20;

  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 100);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
