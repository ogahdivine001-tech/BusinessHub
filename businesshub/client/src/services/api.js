import axios from "axios";

// Auth normally rides on the httpOnly cookie the backend sets on
// login/register — the JWT never touches JS, which is the safest option
// against XSS. But cross-domain deployments (frontend on Vercel, backend
// on Render) hit a real-world snag: mobile Safari/Chrome-on-iOS block or
// unreliably persist cross-site cookies by default ("Prevent Cross-Site
// Tracking"), which can silently log people out on a page reload even
// though the cookie worked moments earlier during normal navigation.
//
// To make auth actually reliable on mobile, we ALSO store the token in
// localStorage as a fallback and send it via a normal Authorization
// header — headers aren't subject to cookie SameSite/third-party rules
// at all. The backend already accepts either method (see middleware/auth.js).
// This does reintroduce a small XSS surface (a compromised page could read
// the token), so the cookie remains the primary mechanism; the header is
// purely a backstop for browsers that won't cooperate with the cookie.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("bh_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      "Something went wrong. Please try again.";
    return Promise.reject(new Error(message));
  },
);

export default api;
