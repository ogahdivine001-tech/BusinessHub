import api from './api';

export const invoiceService = {
  list: (params) => api.get('/invoices', { params }).then((r) => r.data.data),
  get: (id) => api.get(`/invoices/${id}`).then((r) => r.data.data.invoice),
  create: (payload) => api.post('/invoices', payload).then((r) => r.data.data.invoice),
  update: (id, payload) => api.put(`/invoices/${id}`, payload).then((r) => r.data.data.invoice),
  setStatus: (id, status) => api.patch(`/invoices/${id}/status`, { status }).then((r) => r.data.data.invoice),
  remove: (id) => api.delete(`/invoices/${id}`).then((r) => r.data),
  pdfUrl: (id) => `${api.defaults.baseURL}/invoices/${id}/pdf`,
};
