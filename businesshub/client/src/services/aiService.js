import api from "./api";

export const aiService = {
  generate: (type, params) =>
    api
      .post("/ai/generate", { type, ...params })
      .then((r) => r.data.data.content),
  // The BusinessHub Assistant: answers from the Help Center, with recent turns as context.
  chat: (message, history = []) =>
    api.post("/assistant/chat", { message, history }).then((r) => r.data.data),
  usage: () => api.get("/ai/usage").then((r) => r.data.data),
};
