import api from './api';

export const analyticsService = {
  overview: (range) => api.get('/analytics/overview', { params: { range } }).then((r) => r.data.data.stats),
  revenue: (range) => api.get('/analytics/revenue', { params: { range } }).then((r) => r.data.data.series),
  salesByCategory: () => api.get('/analytics/sales-by-category').then((r) => r.data.data.categories),
  bestSellers: () => api.get('/analytics/best-sellers').then((r) => r.data.data.bestSellers),
};
