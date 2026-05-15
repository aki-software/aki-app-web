export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  total?: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  code?: string;
  timestamp: string;
  path?: string;
}
