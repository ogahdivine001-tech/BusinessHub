import api from "./api";

// Following a business and reviewing it.
export const engageService = {
  following: (page = 1) => api.get('/follows/mine', { params: { page } }).then((r) => r.data.data),
  myReviews: (page = 1) => api.get('/reviews/mine', { params: { page } }).then((r) => r.data.data),
  followStatus: (businessId) => api.get(`/follows/${businessId}/status`).then((r) => r.data.data),
  follow: (businessId) => api.post(`/follows/${businessId}`).then((r) => r.data.data),
  unfollow: (businessId) => api.delete(`/follows/${businessId}`).then((r) => r.data.data),
  reviews: (businessId, page = 1) =>
    api.get(`/reviews/business/${businessId}`, { params: { page } }).then((r) => r.data.data),
  myReview: (businessId) => api.get(`/reviews/business/${businessId}/mine`).then((r) => r.data.data.review),
  createReview: (businessId, payload) =>
    api.post(`/reviews/business/${businessId}`, payload).then((r) => r.data.data),
  updateReview: (id, payload) => api.put(`/reviews/${id}`, payload).then((r) => r.data.data),
  deleteReview: (id) => api.delete(`/reviews/${id}`).then((r) => r.data.data),
};
