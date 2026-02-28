// src/services/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "https://gg-quiz-production.up.railway.app/api",
  headers: {
    "ngrok-skip-browser-warning": "true",
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
