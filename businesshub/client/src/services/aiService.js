import api from "./api";

export const aiService = {
  generate: (type, params) =>
    api
      .post("/ai/generate", { type, ...params })
      .then((r) => r.data.data.content),
  usage: () => api.get("/ai/usage").then((r) => r.data.data),
};
