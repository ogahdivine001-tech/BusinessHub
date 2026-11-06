import api from "./api";

// A business owner's side of verification. (Decisions are admin-only and live in adminService.)
export const verificationService = {
  mine: () => api.get("/verification/mine").then((r) => r.data.data),
  request: (payload) => api.post("/verification/request", payload).then((r) => r.data.data),
  pay: () => api.post("/verification/pay").then((r) => r.data.data),
  verifyPayment: (reference) => api.get(`/verification/verify/${encodeURIComponent(reference)}`).then((r) => r.data.data),
};
