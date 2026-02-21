// src/pages/Login.jsx
import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login, register } = useContext(AuthContext);
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isRegister) {
        await register(username, email, password);
      } else {
        await login(email, password);
      }
      navigate("/"); // Vai pro Dashboard depois de logar
    } catch (error) {
      console.error(error);
      alert(
        "Erro ao autenticar! Verifique as credenciais ou se o Spring Boot está rodando.",
      );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-700">
        <h1 className="text-3xl font-black text-center mb-6 text-yellow-400">
          GG QUIZ
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isRegister && (
            <input
              type="text"
              placeholder="Nome de Invocador"
              className="p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="E-mail"
            className="p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Senha"
            className="p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="p-3 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold rounded mt-2 transition"
          >
            {isRegister ? "Criar Conta" : "Entrar na Fila"}
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-gray-400">
          {isRegister ? "Já tem conta?" : "Ainda não tem conta?"}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="ml-1 text-yellow-400 hover:underline"
          >
            {isRegister ? "Faça login" : "Registre-se"}
          </button>
        </p>
      </div>
    </div>
  );
}
