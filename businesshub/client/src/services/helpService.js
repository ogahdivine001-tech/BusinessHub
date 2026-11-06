import api from "./api";

// Public Help Center and live plan details. No login needed.
export const helpService = {
  articles: () => api.get("/help/articles").then((r) => r.data.data.articles),
  article: (id) => api.get(`/help/articles/${encodeURIComponent(id)}`).then((r) => r.data.data.article),
  search: (q) => api.get("/help/search", { params: { q } }).then((r) => r.data.data.results),
  plans: () => api.get("/plans").then((r) => r.data.data),
};
