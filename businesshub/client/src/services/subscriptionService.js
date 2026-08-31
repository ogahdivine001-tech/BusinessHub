import api from './api';

export const subscriptionService = {
  getMine: () => api.get('/subscriptions/me').then((r) => r.data.data),
  checkout: (plan) => api.post('/subscriptions/checkout', { plan }).then((r) => r.data.data),
  verify: (reference) => api.get(`/subscriptions/verify/${reference}`).then((r) => r.data.data),
};
