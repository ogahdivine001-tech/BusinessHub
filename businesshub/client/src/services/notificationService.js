import api from './api';

export const notificationService = {
  list: (params) => api.get('/notifications', { params }).then((r) => r.data.data),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.patch('/notifications/read-all').then((r) => r.data),
};
