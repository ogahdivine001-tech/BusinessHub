import api from './api';

export const invoiceService = {
  list: (params) => api.get('/invoices', { params }).then((r) => r.data.data),
  get: (id) => api.get(`/invoices/${id}`).then((r) => r.data.data.invoice),
  create: (payload) => api.post('/invoices', payload).then((r) => r.data.data.invoice),
  update: (id, payload) => api.put(`/invoices/${id}`, payload).then((r) => r.data.data.invoice),
  setStatus: (id, status) => api.patch(`/invoices/${id}/status`, { status }).then((r) => r.data.data.invoice),
  remove: (id) => api.delete(`/invoices/${id}`).then((r) => r.data),
  // The API signs a share token for every invoice it returns (shareToken).
  // Pass the whole invoice; the link only works with that token.
  pdfUrl: (invoice) => {
    const base = `${api.defaults.baseURL}/invoices/${invoice._id}/pdf`;
    return invoice.shareToken ? `${base}?token=${encodeURIComponent(invoice.shareToken)}` : base;
  },
};
