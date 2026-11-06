import api from './api';

export const receiptService = {
  list: (params) => api.get('/receipts', { params }).then((r) => r.data.data),
  get: (id) => api.get(`/receipts/${id}`).then((r) => r.data.data.receipt),
  create: (payload) => api.post('/receipts', payload).then((r) => r.data.data.receipt),
  remove: (id) => api.delete(`/receipts/${id}`).then((r) => r.data),
  // The API signs a share token for every receipt it returns (shareToken).
  // Pass the whole receipt; the link only works with that token.
  pdfUrl: (receipt) => {
    const base = `${api.defaults.baseURL}/receipts/${receipt._id}/pdf`;
    return receipt.shareToken ? `${base}?token=${encodeURIComponent(receipt.shareToken)}` : base;
  },
};
