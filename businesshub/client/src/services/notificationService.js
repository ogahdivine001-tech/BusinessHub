import api from './api';

export const notificationService = {
  list: (params) => api.get('/notifications', { params }).then((r) => r.data.data),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.patch('/notifications/read-all').then((r) => r.data),
  pin: (id, isPinned) => api.patch(`/notifications/${id}/pin`, { isPinned }).then((r) => r.data.data.notification),
  remove: (id) => api.delete(`/notifications/${id}`).then((r) => r.data),
  clearRead: () => api.delete('/notifications', { params: { scope: 'read' } }).then((r) => r.data.data),
};
