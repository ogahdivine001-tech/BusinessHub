import api from './api';

export const businessService = {
  create: (payload) => api.post('/businesses', payload).then((r) => r.data.data.business),
  getMine: () => api.get('/businesses/me').then((r) => r.data.data.business),
  update: (payload) => api.put('/businesses/me', payload).then((r) => r.data.data.business),
  uploadImage: (image, type) => api.post('/businesses/me/image', { image, type }).then((r) => r.data.data.business),
  getPublic: (slug) => api.get(`/businesses/store/${slug}`).then((r) => r.data.data),
  createPublicOrder: (slug, payload) => api.post(`/businesses/store/${slug}/orders`, payload).then((r) => r.data.data),
};
