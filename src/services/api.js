// src/services/api.js
import axios from "axios";

const api = axios.create({
  baseURL:
    "https://unparticularizing-nongenetically-maureen.ngrok-free.dev/api",
  headers: {
    "ngrok-skip-browser-warning": "true", // 👈 LINHA MÁGICA QUE RESOLVE
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ggquiz_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
