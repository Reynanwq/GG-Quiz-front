// src/services/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080/api", // Porta padrão do seu Spring Boot
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ggquiz_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
