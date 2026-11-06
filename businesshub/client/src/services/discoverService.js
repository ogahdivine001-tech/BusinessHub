import api from "./api";

export const discoverService = {
  search: (params) => api.get("/discover/businesses", { params }).then((r) => r.data.data),
  home: () => api.get("/discover/home").then((r) => r.data.data),
};
