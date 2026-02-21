// src/context/AuthContext.jsx
import { createContext, useState, useEffect } from "react";
import api from "../services/api";

export const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ggquiz_token");
    const storedUser = localStorage.getItem("ggquiz_user");

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    const { token, username, role } = response.data;

    const userData = { username, role };
    localStorage.setItem("ggquiz_token", token);
    localStorage.setItem("ggquiz_user", JSON.stringify(userData));
    setUser(userData);
  };

  const register = async (username, email, password) => {
    const response = await api.post("/auth/register", {
      username,
      email,
      password,
    });
    const { token, username: resUsername, role } = response.data;

    const userData = { username: resUsername, role };
    localStorage.setItem("ggquiz_token", token);
    localStorage.setItem("ggquiz_user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("ggquiz_token");
    localStorage.removeItem("ggquiz_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, signed: !!user, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
