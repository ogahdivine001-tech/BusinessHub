import api from "./api";

export const authService = {
  register: (payload) =>
    api.post("/auth/register", payload).then((r) => {
      if (r.data.data.token)
        localStorage.setItem("bh_token", r.data.data.token);
      return r.data.data;
    }),
  login: (payload) =>
    api.post("/auth/login", payload).then((r) => {
      if (r.data.data.token)
        localStorage.setItem("bh_token", r.data.data.token);
      return r.data.data;
    }),
  logout: () =>
    api.post("/auth/logout").then((r) => {
      localStorage.removeItem("bh_token");
      return r.data;
    }),
  getMe: () => api.get("/auth/me").then((r) => r.data.data),
  forgotPassword: (email) =>
    api.post("/auth/forgot-password", { email }).then((r) => r.data),
  resetPassword: (payload) =>
    api.post("/auth/reset-password", payload).then((r) => r.data),
  becomeSeller: () =>
    api.post("/auth/become-seller").then((r) => r.data.data.user),
  verifyEmail: (token) =>
    api.post("/auth/verify-email", { token }).then((r) => r.data),
  requestEmailVerification: () =>
    api.post("/auth/verify-email/request").then((r) => r.data),
};
