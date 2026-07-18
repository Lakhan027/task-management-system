'use client';

import { useState, useMemo } from 'react';

interface PaginationConfig {
  page: number;
  limit: number;
  total: number;
}

export function usePagination(initialPage = 1, initialLimit = 10) {
  const [config, setConfig] = useState<PaginationConfig>({
    page: initialPage,
    limit: initialLimit,
    total: 0,
  });

  const totalPages = useMemo(
    () => Math.ceil(config.total / config.limit),
    [config.total, config.limit]
  );

  const setPage = (page: number) => {
    setConfig((prev) => ({ ...prev, page: Math.max(1, Math.min(page, totalPages || 1)) }));
  };

  const setLimit = (limit: number) => {
    setConfig((prev) => ({ ...prev, limit, page: 1 }));
  };

  const setTotal = (total: number) => {
    setConfig((prev) => ({ ...prev, total }));
  };

  const nextPage = () => setPage(config.page + 1);
  const prevPage = () => setPage(config.page - 1);

  return {
    ...config,
    totalPages,
    setPage,
    setLimit,
    setTotal,
    nextPage,
    prevPage,
  };
}
