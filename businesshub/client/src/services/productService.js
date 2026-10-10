import api from './api';

export const productService = {
  list: (params) => api.get('/products', { params }).then((r) => r.data.data),
  get: (id) => api.get(`/products/${id}`).then((r) => r.data.data.product),
  create: (payload) => api.post('/products', payload).then((r) => r.data.data.product),
  update: (id, payload) => api.put(`/products/${id}`, payload).then((r) => r.data.data.product),
  remove: (id) => api.delete(`/products/${id}`).then((r) => r.data),
};

export const categoryService = {
  list: () => api.get('/categories').then((r) => r.data.data.categories),
  create: (name) => api.post('/categories', { name }).then((r) => r.data.data.category),
  remove: (id) => api.delete(`/categories/${id}`).then((r) => r.data),
};
