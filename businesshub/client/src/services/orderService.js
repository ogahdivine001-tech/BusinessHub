import api from './api';

export const orderService = {
  list: (params) => api.get('/orders', { params }).then((r) => r.data.data),
  get: (id) => api.get(`/orders/${id}`).then((r) => r.data.data.order),
  create: (payload) => api.post('/orders', payload).then((r) => r.data.data.order),
  updateStatus: (id, payload) => api.patch(`/orders/${id}/status`, payload).then((r) => r.data.data.order),
  remove: (id) => api.delete(`/orders/${id}`).then((r) => r.data),
};
