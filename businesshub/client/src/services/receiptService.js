import api from './api';

export const receiptService = {
  list: (params) => api.get('/receipts', { params }).then((r) => r.data.data),
  get: (id) => api.get(`/receipts/${id}`).then((r) => r.data.data.receipt),
  create: (payload) => api.post('/receipts', payload).then((r) => r.data.data.receipt),
  remove: (id) => api.delete(`/receipts/${id}`).then((r) => r.data),
  pdfUrl: (id) => `${api.defaults.baseURL}/receipts/${id}/pdf`,
};
