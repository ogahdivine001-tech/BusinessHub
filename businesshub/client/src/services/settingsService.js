import api from './api';

export const settingsService = {
  updateProfile: (payload) => api.put('/settings/profile', payload).then((r) => r.data.data.user),
  updateAvatar: (image) => api.put('/settings/avatar', { image }).then((r) => r.data.data.user),
  changePassword: (payload) => api.put('/settings/password', payload).then((r) => r.data),
};
