import api from './api';

// Orders the logged-in person placed from public storefronts while signed in.
export const myOrderService = {
  list: (page = 1) => api.get('/my-orders', { params: { page } }).then((r) => r.data.data),
};
