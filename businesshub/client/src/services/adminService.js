import api from "./api";

export const adminService = {
  overview: () => api.get("/admin/overview").then((r) => r.data.data),
  users: (params) =>
    api.get("/admin/users", { params }).then((r) => r.data.data),
  setUserActive: (id, isActive) =>
    api
      .patch(`/admin/users/${id}/active`, { isActive })
      .then((r) => r.data.data.user),
  businesses: (params) =>
    api.get("/admin/businesses", { params }).then((r) => r.data.data),
  setBusinessPublished: (id, isPublished) =>
    api
      .patch(`/admin/businesses/${id}/published`, { isPublished })
      .then((r) => r.data.data.business),
  setBusinessPlan: (id, plan) =>
    api
      .patch(`/admin/businesses/${id}/plan`, { plan })
      .then((r) => r.data.data.subscription),
  subscriptions: () =>
    api.get("/admin/subscriptions").then((r) => r.data.data.subscriptions),
  messages: () => api.get("/admin/messages").then((r) => r.data.data.messages),
  audienceCount: (params) =>
    api.get("/admin/messages/audience", { params }).then((r) => r.data.data),
  verifications: (params) =>
    api.get("/admin/verifications", { params }).then((r) => r.data.data),
  verification: (id) =>
    api.get(`/admin/verifications/${id}`).then((r) => r.data.data),
  approveVerification: (id, reason) =>
    api.post(`/admin/verifications/${id}/approve`, { reason }).then((r) => r.data.data),
  rejectVerification: (id, reason) =>
    api.post(`/admin/verifications/${id}/reject`, { reason }).then((r) => r.data.data),
  grantVerification: (businessId, reason) =>
    api.post(`/admin/businesses/${businessId}/verification/grant`, { reason }).then((r) => r.data.data),
  revokeVerification: (businessId, reason) =>
    api.post(`/admin/businesses/${businessId}/verification/revoke`, { reason }).then((r) => r.data.data),
  reviews: (params) =>
    api.get("/admin/reviews", { params }).then((r) => r.data.data),
  moderateReview: (id, status, reason) =>
    api.patch(`/admin/reviews/${id}`, { status, reason }).then((r) => r.data.data),
  auditLogs: (params) =>
    api.get("/admin/audit-logs", { params }).then((r) => r.data.data),
  sendMessage: (payload) =>
    api.post("/admin/messages", payload).then((r) => r.data.data.message),
};
