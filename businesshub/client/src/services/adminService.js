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
};
