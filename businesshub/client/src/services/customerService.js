import api from './api';

export const customerService = {
  list: (params) => api.get('/customers', { params }).then((r) => r.data.data),
  get: (id) => api.get(`/customers/${id}`).then((r) => r.data.data.customer),
  create: (payload) => api.post('/customers', payload).then((r) => r.data.data.customer),
  update: (id, payload) => api.put(`/customers/${id}`, payload).then((r) => r.data.data.customer),
  remove: (id) => api.delete(`/customers/${id}`).then((r) => r.data),
};
