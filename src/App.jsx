import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÕES BASE E UTILS
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = "http://localhost:8080/api";

const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${url}`, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (!errorData.message && typeof errorData === "object") {
      const firstMsg = Object.values(errorData)[0];
      if (firstMsg) throw new Error(String(firstMsg));
    }
    throw new Error(errorData.message || "Erro na requisição");
  }

  if (response.status === 204) return null;
  return response.json();
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES DE TELA
// ─────────────────────────────────────────────────────────────────────────────

function Nav({ page, setPage, user, setUser }) {
  const pages = [
    ["home", "HOME"],
    ["quiz", "PLAY"],
    ["ranking", "RANKING"],
    ["suggest", "SUGERIR"],
    ["about", "ABOUT"],
    ...(user?.role === "ADMIN" ? [["admin", "⚙ ADMIN"]] : []),
  ];
  return (
    <nav>
      <div className="logo" onClick={() => setPage("home")}>
        GG<em>QUIZ</em>
      </div>
      <ul className="nav-links">
        {pages.map(([p, l]) => (
          <li key={p}>
            <button
              className={`nb${page === p ? " on" : ""}`}
              onClick={() => setPage(p)}
            >
              {l}
            </button>
          </li>
        ))}
      </ul>
      <div className="nav-r">
        {user ? (
          <>
            <span
              style={{
                fontSize: "7px",
                color: "var(--green)",
                textShadow: "var(--sg)",
              }}
            >
              {user.username}
            </span>
            <button
              className="btn br sm"
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                setUser(null);
                setPage("home");
              }}
            >
              EXIT
            </button>
          </>
        ) : (
          <button className="btn bg sm" onClick={() => setPage("auth")}>
            LOGIN
          </button>
        )}
      </div>
    </nav>
  );
}

function HomePage({ setPage }) {
  const [top3, setTop3] = useState([]);
  const [displayScores, setDisplayScores] = useState([0, 0, 0]);

  useEffect(() => {
    fetchWithAuth("/ranking?period=ALLTIME&page=0&size=3")
      .then((res) => setTop3(res.content || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (top3.length === 0) return;
    const targets = top3.map((r) => parseFloat(r.bestRating || r.rating || 0));
    const steps = 60;
    let step = 0;
    const iv = setInterval(() => {
      step++;
      setDisplayScores(targets.map((t) => Math.min(t * (step / steps), t)));
      if (step >= steps) clearInterval(iv);
    }, 20);
    return () => clearInterval(iv);
  }, [top3]);

  const rankColors = ["var(--yellow)", "var(--cyan)", "var(--magenta)"];
  const rankGlows = ["var(--sy)", "var(--sc)", "0 0 8px var(--magenta)"];

  return (
    <div className="pg">
      <div className="hero">
        <div className="hero-bg" />
        <div className="insert">▶ HEAVY IS THE CROWN ◀</div>

        <style>{`
          @keyframes flicker {
            0%, 94%, 100% { opacity: 1; }
            95% { opacity: 0.3; }
            97% { opacity: 1; }
            99% { opacity: 0.15; }
          }
        `}</style>

        <div
          className="hi-score"
          style={{ flexDirection: "column", gap: 6, alignItems: "center" }}
        >
          {top3.length === 0 ? (
            <span>HI-SCORE &nbsp; ------</span>
          ) : (
            top3.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    color: rankColors[i],
                    textShadow: rankGlows[i],
                    minWidth: "2.5ch",
                    animation: `flicker ${2.5 + i * 0.8}s linear ${i * 0.6}s infinite`,
                  }}
                >
                  #{i + 1}
                </span>
                <span
                  style={{
                    color: "var(--dim)",
                    fontSize: "0.75em",
                    letterSpacing: 1,
                  }}
                >
                  {(r.username || "???").toUpperCase().padEnd(12, " ")}
                </span>
                <span
                  style={{ color: rankColors[i], textShadow: rankGlows[i] }}
                >
                  {displayScores[i] != null
                    ? displayScores[i].toFixed(1).padStart(8, "0")
                    : "------"}
                </span>
              </div>
            ))
          )}
        </div>

        <h1 className="hero-t1">GG QUIZ</h1>
        <h2 className="hero-t2">ESPORTS KNOWLEDGE BATTLE</h2>
        <div className="hero-btns mt-8">
          <button className="btn by" onClick={() => setPage("quiz")}>
            ▶ PLAYER 1 START
          </button>
          <button className="btn bc" onClick={() => setPage("ranking")}>
            RANKING
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthPage({ setUser, setPage }) {
  const [isReg, setIsReg] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    if (isForgot) {
      try {
        await fetchWithAuth("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email }),
        });
        setSuccessMsg(
          "Se o e-mail estiver cadastrado, você receberá o link em instantes.",
        );
        setEmail("");
      } catch (err) {
        setSuccessMsg(
          "Se o e-mail estiver cadastrado, você receberá o link em instantes.",
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    try {
      const endpoint = isReg ? "/auth/register" : "/auth/login";
      const body = isReg ? { username, email, password } : { email, password };

      const res = await fetchWithAuth(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      localStorage.setItem("token", res.token);
      localStorage.setItem(
        "user",
        JSON.stringify({ username: res.username, role: res.role }),
      );

      setUser({ username: res.username, role: res.role });
      setPage("home");
    } catch (err) {
      setErrorMsg(err.message || "Erro de autenticação.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (mode) => {
    setIsReg(mode === "reg");
    setIsForgot(mode === "forgot");
    setErrorMsg("");
    setSuccessMsg("");
    setEmail("");
    setPassword("");
    setUsername("");
  };

  return (
    <div className="pg flex justify-center items-center">
      <div className="auth-wrap w-full max-w-md">
        <div className="auth-box">
          <h2 className="text-center h1 mb-6">
            {isForgot ? "RECUPERAR SENHA" : isReg ? "REGISTRO" : "LOGIN"}
          </h2>

          {successMsg && (
            <p
              className="text-center mb-4 font-['VT323'] text-xl"
              style={{ color: "var(--green)", textShadow: "var(--sg)" }}
            >
              {successMsg}
            </p>
          )}
          {errorMsg && (
            <p
              className="text-center text-[var(--red)] text-xs mb-4"
              style={{ textShadow: "var(--sr)" }}
            >
              {errorMsg}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            {isReg && !isForgot && (
              <input
                className="fi"
                placeholder="NOME DE INVOCADOR"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            )}
            <input
              className="fi"
              type="email"
              placeholder="E-MAIL"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {!isForgot && (
              <input
                className="fi"
                type="password"
                placeholder="SENHA"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
            <button
              className="btn bg w-full mt-4"
              type="submit"
              disabled={loading}
            >
              {loading ? "PROCESSANDO..." : isForgot ? "ENVIAR LINK" : "ENTRAR"}
            </button>
          </form>

          <div
            style={{
              marginTop: 24,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              alignItems: "center",
            }}
          >
            {!isForgot && (
              <p
                className="font-['VT323'] text-xl cursor-pointer"
                style={{ color: "var(--dim)" }}
                onClick={() => switchMode(isReg ? "login" : "reg")}
              >
                {isReg ? (
                  <>
                    JÁ TEM CONTA?{" "}
                    <span
                      style={{
                        color: "var(--yellow)",
                        textShadow: "var(--sy)",
                      }}
                    >
                      LOGIN
                    </span>
                  </>
                ) : (
                  <>
                    NÃO TEM CONTA?{" "}
                    <span
                      style={{
                        color: "var(--yellow)",
                        textShadow: "var(--sy)",
                      }}
                    >
                      REGISTRE-SE
                    </span>
                  </>
                )}
              </p>
            )}
            {!isReg && !isForgot && (
              <p
                className="font-['VT323'] text-lg cursor-pointer"
                style={{ color: "var(--dim)", opacity: 0.7 }}
                onClick={() => switchMode("forgot")}
              >
                ESQUECEU A SENHA?{" "}
                <span style={{ color: "var(--cyan)", textShadow: "var(--sc)" }}>
                  RECUPERAR
                </span>
              </p>
            )}
            {isForgot && (
              <p
                className="font-['VT323'] text-xl cursor-pointer"
                style={{ color: "var(--dim)" }}
                onClick={() => switchMode("login")}
              >
                ←{" "}
                <span
                  style={{ color: "var(--yellow)", textShadow: "var(--sy)" }}
                >
                  VOLTAR AO LOGIN
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TELA: REDEFINIR SENHA (acessada via link do email)
// ─────────────────────────────────────────────────────────────────────────────

function ResetPasswordPage({ setPage }) {
  const token = new URLSearchParams(window.location.search).get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="pg flex justify-center items-center">
        <div className="auth-box text-center">
          <p className="h1 mb-4" style={{ color: "var(--red)" }}>
            LINK INVÁLIDO
          </p>
          <p
            className="font-['VT323'] text-xl mb-6"
            style={{ color: "var(--dim)" }}
          >
            Este link de recuperação é inválido ou está incompleto.
          </p>
          <button className="btn bg" onClick={() => setPage("auth")}>
            VOLTAR AO LOGIN
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (password !== confirm) {
      setErrorMsg("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await fetchWithAuth("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword: password }),
      });
      setDone(true);
    } catch (err) {
      setErrorMsg(err.message || "Link inválido ou expirado.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="pg flex justify-center items-center">
        <div className="auth-box text-center">
          <p
            className="font-['VT323'] text-4xl mb-4"
            style={{ color: "var(--green)", textShadow: "var(--sg)" }}
          >
            ✓ SENHA REDEFINIDA!
          </p>
          <p
            className="font-['VT323'] text-xl mb-6"
            style={{ color: "var(--dim)" }}
          >
            Sua senha foi alterada com sucesso. Faça login para continuar.
          </p>
          <button
            className="btn by"
            onClick={() => {
              window.history.replaceState({}, "", window.location.pathname);
              setPage("auth");
            }}
          >
            ▶ IR PARA O LOGIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pg flex justify-center items-center">
      <div className="auth-wrap w-full max-w-md">
        <div className="auth-box">
          <h2 className="text-center h1 mb-2">NOVA SENHA</h2>
          <p
            className="text-center font-['VT323'] text-lg mb-6"
            style={{ color: "var(--dim)" }}
          >
            Digite e confirme sua nova senha.
          </p>

          {errorMsg && (
            <p
              className="text-center mb-4 font-['VT323'] text-xl"
              style={{ color: "var(--red)", textShadow: "var(--sr)" }}
            >
              {errorMsg}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <input
              className="fi"
              type="password"
              placeholder="NOVA SENHA"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              className="fi"
              type="password"
              placeholder="CONFIRMAR SENHA"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <button
              className="btn by w-full mt-4"
              type="submit"
              disabled={loading}
            >
              {loading ? "SALVANDO..." : "▶ SALVAR NOVA SENHA"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function RankingPage({ user }) {
  const [rankingData, setRankingData] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingRanking, setLoadingRanking] = useState(true);
  const [myPosition, setMyPosition] = useState(null);

  const [period, setPeriod] = useState("ALLTIME");
  const [regionId, setRegionId] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchWithAuth("/regions")
      .then((res) => setRegions(res || []))
      .catch((err) => console.error("Erro ao carregar regiões", err))
      .finally(() => setLoadingRegions(false));
  }, []);

  useEffect(() => {
    const fetchRanking = async () => {
      setLoadingRanking(true);
      try {
        let url = `/ranking?period=${period}&page=${page}&size=10`;
        if (regionId !== null) url += `&regionId=${regionId}`;
        const data = await fetchWithAuth(url);
        setRankingData(data.content || []);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        console.error(err);
        setRankingData([]);
      } finally {
        setLoadingRanking(false);
      }
    };
    fetchRanking();
  }, [period, regionId, page]);

  useEffect(() => {
    if (!user) {
      setMyPosition(null);
      return;
    }
    let url = `/ranking/me?period=${period}`;
    if (regionId !== null) url += `&regionId=${regionId}`;
    fetchWithAuth(url)
      .then((data) => setMyPosition(data))
      .catch(() => setMyPosition(null));
  }, [period, regionId, user]);

  const renderRow = (r, index) => {
    const pos = page * 10 + index + 1;
    const isTop1 = pos === 1;
    const isTop2 = pos === 2;
    const isTop3 = pos === 3;

    return (
      <tr key={index}>
        <td
          className={`rpos ${isTop1 ? "rp1" : isTop2 ? "rp2" : isTop3 ? "rp3" : "rpn"}`}
        >
          #{pos}
        </td>
        <td className="ruser">
          {r.username || r.user?.username || "DESCONHECIDO"}
        </td>
        <td className="rrat" style={{ textAlign: "center" }}>
          {typeof (r.bestRating || r.rating) === "number"
            ? (r.bestRating || r.rating).toFixed(1)
            : r.bestRating || r.rating || 0}
        </td>
        <td className="ratt" style={{ textAlign: "right" }}>
          {r.totalAttempts || r.attempts || 0}
        </td>
      </tr>
    );
  };

  return (
    <div className="pg">
      <p className="h1">RANKING GLOBAL</p>
      <p className="sub">// Melhores analistas do servidor</p>
      <div className="divpix" />

      <div className="rctrls">
        {["ALLTIME", "MONTHLY", "WEEKLY", "DAILY"].map((p) => (
          <button
            key={p}
            className={`cb ${period === p ? "on" : ""}`}
            onClick={() => {
              setPeriod(p);
              setPage(0);
            }}
          >
            {p}
          </button>
        ))}

        <div className="csep" />

        <button
          className={`cb ${regionId === null ? "on" : ""}`}
          onClick={() => {
            setRegionId(null);
            setPage(0);
          }}
        >
          GLOBAL
        </button>

        {loadingRegions ? (
          <span className="text-[var(--dim)] font-['VT323'] text-lg ml-2">
            CARREGANDO LIGAS...
          </span>
        ) : (
          regions.map((r) => (
            <button
              key={r.id}
              className={`cb ${regionId === r.id ? "on" : ""}`}
              onClick={() => {
                setRegionId(r.id);
                setPage(0);
              }}
            >
              {r.slug || r.name}
            </button>
          ))
        )}
      </div>

      {user && (
        <div
          style={{
            margin: "16px 0",
            padding: "12px 20px",
            border: "1px solid var(--cyan)",
            background: "rgba(0,255,255,0.04)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span
            className="font-['VT323'] text-xl"
            style={{ color: "var(--cyan)", textShadow: "var(--sc)" }}
          >
            ⚡ SUA POSIÇÃO
          </span>
          {myPosition ? (
            <div
              style={{
                display: "flex",
                gap: 24,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span
                className="font-['VT323'] text-2xl"
                style={{ color: "var(--yellow)", textShadow: "var(--sy)" }}
              >
                #{myPosition.position}
              </span>
              <span
                className="font-['VT323'] text-xl"
                style={{ color: "var(--fg)" }}
              >
                {(myPosition.username || "").toUpperCase()}
              </span>
              <span
                className="font-['VT323'] text-xl"
                style={{ color: "var(--dim)" }}
              >
                RATING:{" "}
                <span style={{ color: "var(--green)" }}>
                  {Number(myPosition.bestRating).toFixed(1)}
                </span>
              </span>
              <span
                className="font-['VT323'] text-xl"
                style={{ color: "var(--dim)" }}
              >
                TENTATIVAS:{" "}
                <span style={{ color: "var(--green)" }}>
                  {myPosition.totalAttempts}
                </span>
              </span>
            </div>
          ) : (
            <span
              className="font-['VT323'] text-xl"
              style={{ color: "var(--dim)" }}
            >
              Você ainda não jogou neste período/região.
            </span>
          )}
        </div>
      )}

      <table className="rtbl mt-4">
        <thead>
          <tr>
            <th>POS</th>
            <th>INVOCADOR</th>
            <th style={{ textAlign: "center" }}>RATING</th>
            <th style={{ textAlign: "right" }}>TENTATIVAS</th>
          </tr>
        </thead>
        <tbody>
          {loadingRanking ? (
            <tr>
              <td colSpan="4" className="text-center py-8 text-[var(--yellow)]">
                CARREGANDO DADOS DA API...
              </td>
            </tr>
          ) : rankingData.length === 0 ? (
            <tr>
              <td colSpan="4" className="text-center py-8 text-[var(--dim)]">
                NENHUM REGISTRO ENCONTRADO.
              </td>
            </tr>
          ) : (
            rankingData.map((r, i) => renderRow(r, i))
          )}
        </tbody>
      </table>

      {!loadingRanking && totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <button
            className="btn bg sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            ◀ ANTERIOR
          </button>
          <span className="font-['VT323'] text-xl text-[var(--dim)]">
            PÁGINA {page + 1} DE {totalPages}
          </span>
          <button
            className="btn bg sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            PRÓXIMA ▶
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA: SUGERIR QUESTÃO
// ─────────────────────────────────────────────────────────────────────────────

function SuggestPage({ user, setPage }) {
  const [regions, setRegions] = useState([]);
  const [loadingRegions, setLoadingRegions] = useState(true);

  const [regionId, setRegionId] = useState("");
  const [statement, setStatement] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctOption, setCorrectOption] = useState("");
  const [difficulty, setDifficulty] = useState("");

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchWithAuth("/regions")
      .then((res) => setRegions(res || []))
      .catch(() => {})
      .finally(() => setLoadingRegions(false));
  }, []);

  if (!user) {
    return (
      <div className="pg flex justify-center items-center">
        <div className="auth-box text-center">
          <p className="h1 mb-4">ACESSO RESTRITO</p>
          <p
            className="font-['VT323'] text-xl mb-6"
            style={{ color: "var(--dim)" }}
          >
            Você precisa estar logado para sugerir questões.
          </p>
          <button className="btn bg" onClick={() => setPage("auth")}>
            FAZER LOGIN
          </button>
        </div>
      </div>
    );
  }

  const resetForm = () => {
    setRegionId("");
    setStatement("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setCorrectOption("");
    setDifficulty("");
    setErrorMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!correctOption) {
      setErrorMsg("Selecione a alternativa correta.");
      return;
    }
    if (!difficulty) {
      setErrorMsg("Selecione a dificuldade.");
      return;
    }

    setLoading(true);
    try {
      await fetchWithAuth("/questions", {
        method: "POST",
        body: JSON.stringify({
          regionId: Number(regionId),
          statement,
          optionA,
          optionB,
          optionC,
          optionD,
          correctOption,
          difficulty: Number(difficulty),
        }),
      });

      setSuccessMsg(
        "Questão enviada! Ela ficará pendente até revisão do admin.",
      );
      resetForm();
    } catch (err) {
      setErrorMsg(err.message || "Erro ao enviar questão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pg">
      <p className="h1">SUGERIR QUESTÃO</p>
      <p className="sub">// Contribua com o banco de perguntas</p>
      <div className="divpix" />

      <div className="auth-wrap" style={{ maxWidth: 640, margin: "0 auto" }}>
        <div className="auth-box">
          {successMsg && (
            <p
              className="text-center mb-4 font-['VT323'] text-2xl"
              style={{ color: "var(--green)", textShadow: "var(--sg)" }}
            >
              {successMsg}
            </p>
          )}
          {errorMsg && (
            <p
              className="text-center mb-4 font-['VT323'] text-2xl"
              style={{ color: "var(--red)", textShadow: "var(--sr)" }}
            >
              {errorMsg}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <label className="slbl">LIGA / REGIÃO</label>
            {loadingRegions ? (
              <p
                className="font-['VT323'] text-lg mb-4"
                style={{ color: "var(--dim)" }}
              >
                CARREGANDO LIGAS...
              </p>
            ) : (
              <select
                className="fi"
                required
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
              >
                <option value="">-- SELECIONE --</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.slug || r.name}
                  </option>
                ))}
              </select>
            )}

            <label className="slbl">PERGUNTA</label>
            <textarea
              className="fi"
              placeholder="Ex: Qual time ganhou o Worlds 2022?"
              required
              rows={3}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              style={{ resize: "vertical" }}
            />

            <label className="slbl">ALTERNATIVAS</label>
            {[
              ["A", optionA, setOptionA],
              ["B", optionB, setOptionB],
              ["C", optionC, setOptionC],
              ["D", optionD, setOptionD],
            ].map(([letra, val, setter]) => (
              <div key={letra} className="flex items-center gap-2 mb-2">
                <span
                  className="font-['VT323'] text-2xl w-6 text-center"
                  style={{ color: "var(--yellow)", textShadow: "var(--sy)" }}
                >
                  {letra}
                </span>
                <input
                  className="fi"
                  style={{ marginBottom: 0, flex: 1 }}
                  placeholder={`Alternativa ${letra}`}
                  required
                  value={val}
                  onChange={(e) => setter(e.target.value)}
                />
              </div>
            ))}

            <label className="slbl" style={{ marginTop: 16 }}>
              ALTERNATIVA CORRETA
            </label>
            <div className="flex gap-2 mb-4">
              {["A", "B", "C", "D"].map((opt) => (
                <button
                  type="button"
                  key={opt}
                  className={`rsb${correctOption === opt ? " sel" : ""}`}
                  style={{ flex: 1 }}
                  onClick={() => setCorrectOption(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>

            <label className="slbl">DIFICULDADE (1 fácil → 10 lendário)</label>
            <div className="flex gap-2 flex-wrap mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  type="button"
                  key={n}
                  className={`rsb${Number(difficulty) === n ? " sel" : ""}`}
                  style={{ minWidth: 36 }}
                  onClick={() => setDifficulty(n)}
                >
                  {n}
                </button>
              ))}
            </div>

            <button
              className="btn by w-full mt-2"
              type="submit"
              disabled={loading}
            >
              {loading ? "ENVIANDO..." : "▶ ENVIAR SUGESTÃO"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA: QUIZ
// ─────────────────────────────────────────────────────────────────────────────

function QuizPage({ user, setPage }) {
  const [phase, setPhase] = useState("setup");
  const [regions, setRegions] = useState([]);
  const [loadingRegions, setLoadingRegions] = useState(true);

  const [mode, setMode] = useState("GLOBAL");
  const [regionId, setRegionId] = useState(null);

  const [qs, setQs] = useState([]);
  const [idx, setIdx] = useState(0);
  const [correctIds, setCorrectIds] = useState([]);
  const [sel, setSel] = useState(null);
  const [timer, setTimer] = useState(20);
  const [secs, setSecs] = useState(0);
  const [ts, setTs] = useState(null);

  const [serverResult, setServerResult] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState("");

  const pickingRef = useRef(false);

  useEffect(() => {
    fetchWithAuth("/regions")
      .then((res) => setRegions(res || []))
      .catch((err) => console.error("Erro ao carregar regiões", err))
      .finally(() => setLoadingRegions(false));
  }, []);

  const q = qs[idx];

  useEffect(() => {
    if (phase !== "playing" || sel !== null) return;

    const iv = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(iv);
          pick(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx, sel]);

  async function start() {
    if (!user) {
      alert("Você precisa estar logado para jogar!");
      setPage("auth");
      return;
    }

    pickingRef.current = false;

    setLoadingMsg("BUSCANDO PARTIDA NA API...");
    try {
      let url = `/sessions/start?mode=${mode}`;
      if (mode === "REGIONAL" && regionId) {
        url += `&regionId=${regionId}`;
      }

      const questions = await fetchWithAuth(url);
      if (!questions || questions.length === 0) {
        alert("Nenhuma pergunta encontrada para este modo/região no momento.");
        setLoadingMsg("");
        return;
      }

      setQs(questions);
      setCorrectIds([]);
      setIdx(0);
      setSel(null);
      setTimer(20);
      setTs(Date.now());
      setSecs(0);
      setServerResult(null);
      setPhase("playing");
      setLoadingMsg("");
    } catch (error) {
      alert(error.message || "Erro ao iniciar partida");
      setLoadingMsg("");
    }
  }

  async function pick(option) {
    if (pickingRef.current) return;
    pickingRef.current = true;

    setSel(option);

    const elapsed = Math.round((Date.now() - (ts || Date.now())) / 1000) || 1;
    const currentTotalSecs = secs + elapsed;
    setSecs(currentTotalSecs);
    setTs(Date.now());

    const isCorrect =
      option !== null &&
      String(option).toUpperCase() === String(q.correctOption).toUpperCase();

    const currentCorrectIds = correctIds;
    const currentQuestion = q;

    setTimeout(async () => {
      if (isCorrect) {
        const newCorrects = [...currentCorrectIds, Number(currentQuestion.id)];
        setCorrectIds(newCorrects);

        if (idx + 1 >= qs.length) {
          await finishSession(newCorrects, null, currentTotalSecs);
        } else {
          pickingRef.current = false;
          setIdx((i) => i + 1);
          setSel(null);
          setTimer(20);
        }
      } else {
        const safeCorrectIds = currentCorrectIds.map(Number);
        const safeWrongId = Number(currentQuestion.id);
        await finishSession(safeCorrectIds, safeWrongId, currentTotalSecs);
      }
    }, 850);
  }

  async function finishSession(cIds, wId, duration) {
    setPhase("result");
    setLoadingMsg("SALVANDO NO SERVIDOR...");
    setServerResult(null);

    const payload = {
      mode,
      durationSeconds: Math.max(duration, 1),
      correctQuestionIds: cIds,
      ...(mode === "REGIONAL" && regionId
        ? { regionId: Number(regionId) }
        : {}),
      ...(wId != null ? { wrongQuestionId: wId } : {}),
    };

    try {
      const result = await fetchWithAuth("/sessions/finish", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setServerResult(result);
    } catch (error) {
      console.error("[finishSession] erro →", error);
      alert("Sessão finalizada, mas houve erro ao salvar no servidor.");
      setServerResult({ rating: 0, status: "ERROR" });
    } finally {
      setLoadingMsg("");
    }
  }

  if (phase === "setup")
    return (
      <div className="pg">
        <p className="h1">PLAYER SELECT</p>
        <p className="sub">// Escolha modo e inicie a partida</p>
        <div className="divpix" />

        {loadingMsg && (
          <p className="text-[var(--yellow)] mb-4">{loadingMsg}</p>
        )}

        <div className="mode-grid">
          <div
            className={`mc${mode === "GLOBAL" ? " sel" : ""}`}
            onClick={() => {
              setMode("GLOBAL");
              setRegionId(null);
            }}
          >
            <span className="mc-icon">🌎</span>
            <div className="mc-name">GLOBAL</div>
            <p className="mc-desc">Misturado</p>
          </div>
          <div
            className={`mc${mode === "REGIONAL" ? " sel" : ""}`}
            onClick={() => setMode("REGIONAL")}
          >
            <span className="mc-icon">🗺️</span>
            <div className="mc-name">REGIONAL</div>
            <p className="mc-desc">Específico</p>
          </div>
        </div>

        {mode === "REGIONAL" && (
          <div className="rsel mt-4">
            {loadingRegions ? (
              <span className="text-[var(--dim)] font-['VT323'] text-lg">
                CARREGANDO LIGAS DA API...
              </span>
            ) : regions.length === 0 ? (
              <span className="text-[var(--red)] font-['VT323'] text-lg">
                Nenhuma liga encontrada.
              </span>
            ) : (
              regions.map((r) => (
                <button
                  key={r.id}
                  className={`rsb${regionId === r.id ? " sel" : ""}`}
                  onClick={() => setRegionId(r.id)}
                >
                  {r.slug || r.name}
                </button>
              ))
            )}
          </div>
        )}

        <button
          className="btn by mt-6"
          onClick={start}
          disabled={!!loadingMsg || (mode === "REGIONAL" && !regionId)}
        >
          ▶ INICIAR PARTIDA
        </button>
      </div>
    );

  if (phase === "playing" && q)
    return (
      <div className="pg">
        <div className="hud">
          <div className="hud-item">
            <span className="hlbl">PERGUNTA</span>
            <span className="hval">
              {idx + 1}/{qs.length}
            </span>
          </div>
          <div className="hud-item">
            <span className="hlbl">TEMPO</span>
            <span className={`hval ${timer <= 5 ? "danger" : ""}`}>
              {timer}s
            </span>
          </div>
        </div>
        <div className="pbar">
          <div className="pfill" style={{ width: `${(timer / 20) * 100}%` }} />
        </div>
        <div className="qbox">
          <p className="qtext">{q.statement}</p>
        </div>
        <div className="opts">
          {["A", "B", "C", "D"].map((opt) => {
            let c = "";
            if (sel !== null && opt === q.correctOption) c = " ok";
            else if (sel === opt && opt !== q.correctOption) c = " no";
            return (
              <button
                key={opt}
                disabled={sel !== null}
                className={`opt${c}`}
                onClick={() => pick(opt)}
              >
                <span className="olet">{opt}</span>
                <span>{q[`option${opt}`]}</span>
              </button>
            );
          })}
        </div>
      </div>
    );

  if (phase === "result")
    return (
      <div className="pg">
        <div className="result">
          <div className="rlbl">RESULTADO DA PARTIDA</div>

          {loadingMsg ? (
            <div
              className="rheadline rwin"
              style={{ color: "var(--cyan)", textShadow: "var(--sc)" }}
            >
              {loadingMsg}
            </div>
          ) : (
            <>
              {correctIds.length > 0 && serverResult?.status !== "ERROR" ? (
                <div className="rheadline rwin">GG WP! VITÓRIA!</div>
              ) : (
                <div className="rheadline rlose">DERROTA... FF 15</div>
              )}

              <div className="rrating">
                <div className="rnum">
                  +
                  {serverResult?.rating
                    ? serverResult.rating.toFixed(1)
                    : "0.0"}
                </div>
              </div>
            </>
          )}

          <div className="rbtns mt-8">
            <button className="btn by" onClick={start} disabled={!!loadingMsg}>
              ▶ JOGAR NOVAMENTE
            </button>
            <button
              className="btn bg"
              onClick={() => {
                setPhase("setup");
                setSecs(0);
              }}
              disabled={!!loadingMsg}
            >
              MENU DE MODOS
            </button>
          </div>
        </div>
      </div>
    );

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA: ABOUT
// ─────────────────────────────────────────────────────────────────────────────

function AboutPage() {
  const blocks = [
    {
      title: "// O QUE É O GG QUIZ?",
      color: "var(--green)",
      shadow: "var(--sg)",
      content: [
        "GG Quiz é uma plataforma de trivia competitiva focada no cenário competitivo de League of Legends. Teste seus conhecimentos sobre times, jogadores, campeonatos e momentos históricos das principais ligas do LoL ao redor do mundo.",
        "Cada partida é composta por até 10 perguntas. Responda corretamente o máximo que puder — mas atenção: uma resposta errada encerra a rodada na hora.",
      ],
    },
    {
      title: "// COMO FUNCIONA?",
      color: "var(--cyan)",
      shadow: "var(--sc)",
      content: [
        "▶  Escolha o modo GLOBAL (perguntas de todas as ligas) ou REGIONAL (foco em uma liga específica).",
        "▶  Você tem 20 segundos para responder cada pergunta. O tempo acaba e é considerado erro.",
        "▶  Ao final da partida seu rating é calculado e o ranking é atualizado automaticamente.",
        "▶  Você também pode sugerir novas perguntas — elas ficam pendentes até aprovação de um admin.",
      ],
    },
    {
      title: "// COMO O RATING É CALCULADO?",
      color: "var(--yellow)",
      shadow: "var(--sy)",
      content: [
        "A fórmula leva em conta três fatores: dificuldade das questões acertadas, tempo total gasto e dificuldade da questão errada.",
      ],
      formula: true,
    },
    {
      title: "// PERÍODOS DO RANKING",
      color: "var(--magenta)",
      shadow: "0 0 8px var(--magenta)",
      content: [
        "DAILY    → melhor rating do dia atual.",
        "WEEKLY   → melhor rating da semana corrente.",
        "MONTHLY  → melhor rating do mês corrente.",
        "ALLTIME  → maior rating já registrado em qualquer partida.",
        "Em todos os períodos, cada jogador aparece apenas uma vez, com seu melhor resultado dentro do período.",
      ],
    },
  ];

  return (
    <div className="pg">
      <p className="h1">ABOUT</p>
      <p className="sub">// Manual do analista</p>
      <div className="divpix" />

      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        {blocks.map((b, i) => (
          <div key={i} className="auth-box" style={{ padding: "24px 28px" }}>
            <p
              className="font-['VT323'] text-2xl mb-4"
              style={{ color: b.color, textShadow: b.shadow }}
            >
              {b.title}
            </p>
            {b.content.map((line, j) => (
              <p
                key={j}
                className="font-['VT323'] text-xl mb-2"
                style={{ color: "var(--dim)", lineHeight: 1.6 }}
              >
                {line}
              </p>
            ))}
            {b.formula && (
              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div
                  className="auth-box"
                  style={{ padding: "12px 16px", borderColor: "var(--yellow)" }}
                >
                  <p
                    className="font-['VT323'] text-xl"
                    style={{ color: "var(--yellow)", marginBottom: 4 }}
                  >
                    rating = (soma das dificuldades × 100 ÷ tempo) × penalidade
                  </p>
                  <p
                    className="font-['VT323'] text-lg"
                    style={{ color: "var(--dim)", opacity: 0.8 }}
                  >
                    penalidade = 0.2 + (0.8 × (dificuldade_errada − 1) ÷ 9)
                  </p>
                </div>
                <div
                  className="auth-box"
                  style={{ padding: "12px 16px", borderColor: "var(--dim)" }}
                >
                  {[
                    [
                      "var(--green)",
                      "Questões difíceis valem muito mais — foque nas pesadas.",
                    ],
                    [
                      "var(--red)",
                      "Quanto mais tempo levar, menos pontos você ganha.",
                    ],
                    [
                      "var(--red)",
                      "Errar uma questão fácil é punido com força: até 80% dos pontos vão embora.",
                    ],
                    [
                      "var(--yellow)",
                      "Errar uma questão difícil tem penalidade menor — chegar longe já conta.",
                    ],
                    [
                      "var(--green)",
                      "Completar todas sem errar nenhuma? Sem penalidade. Rating cheio.",
                    ],
                  ].map(([color, text], i) => (
                    <p
                      key={i}
                      className="font-['VT323'] text-lg mb-1"
                      style={{ color: "var(--dim)" }}
                    >
                      <span style={{ color }}>▶ </span>
                      {text}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        <p
          className="text-center font-['VT323'] text-lg pb-8"
          style={{ color: "var(--dim)", opacity: 0.5 }}
        >
          GG QUIZ © 2026 — MADE FOR THE LOL COMPETITIVE COMMUNITY
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: ABA REGIÕES
// ─────────────────────────────────────────────────────────────────────────────

function AdminRegionsTab({ showToast }) {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(null);

  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchRegions = async () => {
    setLoading(true);
    try {
      const data = await fetchWithAuth("/regions/all");
      setRegions(data || []);
    } catch (err) {
      try {
        const data = await fetchWithAuth("/regions");
        setRegions(data || []);
      } catch {
        showToast("Erro ao carregar regiões.", "err");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegions();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newSlug.trim() || !newName.trim()) return;
    setCreating(true);
    try {
      await fetchWithAuth("/regions", {
        method: "POST",
        body: JSON.stringify({ slug: newSlug.trim(), name: newName.trim() }),
      });
      showToast(`Região "${newName}" criada com sucesso!`, "ok");
      setNewSlug("");
      setNewName("");
      fetchRegions();
    } catch (err) {
      showToast(err.message || "Erro ao criar região.", "err");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id, currentActive) => {
    setToggleLoading(id);
    try {
      await fetchWithAuth(`/regions/${id}/toggle`, { method: "PATCH" });
      showToast(
        currentActive ? "Região desativada." : "Região ativada!",
        currentActive ? "err" : "ok",
      );
      fetchRegions();
    } catch (err) {
      showToast(err.message || "Erro ao alterar status.", "err");
    } finally {
      setToggleLoading(null);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <p className="sub" style={{ marginBottom: 20 }}>
        // Criar e gerenciar ligas/regiões
      </p>

      <div
        className="auth-box"
        style={{ padding: "20px 24px", marginBottom: 28 }}
      >
        <p
          className="font-['VT323'] text-2xl mb-4"
          style={{ color: "var(--cyan)", textShadow: "var(--sc)" }}
        >
          + NOVA REGIÃO
        </p>
        <form onSubmit={handleCreate}>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="slbl">SLUG</label>
              <input
                className="fi"
                style={{ marginBottom: 0 }}
                placeholder="Ex: lck"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                required
              />
            </div>
            <div style={{ flex: 2 }}>
              <label className="slbl">NOME</label>
              <input
                className="fi"
                style={{ marginBottom: 0 }}
                placeholder="Ex: League Champions Korea"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>
          </div>
          <button
            className="btn by w-full mt-2"
            type="submit"
            disabled={creating}
          >
            {creating ? "CRIANDO..." : "▶ CRIAR REGIÃO"}
          </button>
        </form>
      </div>

      {loading ? (
        <p
          className="font-['VT323'] text-2xl text-center"
          style={{ color: "var(--yellow)" }}
        >
          CARREGANDO REGIÕES...
        </p>
      ) : regions.length === 0 ? (
        <p
          className="font-['VT323'] text-xl text-center"
          style={{ color: "var(--dim)" }}
        >
          Nenhuma região cadastrada.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {regions.map((r) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 18px",
                border: `1px solid ${r.active ? "var(--border)" : "rgba(255,255,255,0.06)"}`,
                background: r.active ? "transparent" : "rgba(255,255,255,0.02)",
                opacity: r.active ? 1 : 0.55,
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <span
                  className="font-['VT323'] text-xl"
                  style={{
                    color: r.active ? "var(--cyan)" : "var(--dim)",
                    textShadow: r.active ? "var(--sc)" : "none",
                    minWidth: 40,
                  }}
                >
                  {(r.slug || "").toUpperCase()}
                </span>
                <span
                  className="font-['VT323'] text-xl"
                  style={{
                    color: "var(--fg)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.name}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexShrink: 0,
                }}
              >
                <span
                  className="font-['VT323'] text-lg"
                  style={{
                    color: r.active ? "var(--green)" : "var(--red)",
                    textShadow: r.active ? "var(--sg)" : "var(--sr)",
                    minWidth: 56,
                    textAlign: "right",
                  }}
                >
                  {r.active ? "● ATIVA" : "○ INATIVA"}
                </span>
                <button
                  className={`btn sm ${r.active ? "br" : "bg"}`}
                  style={{ minWidth: 90 }}
                  disabled={toggleLoading === r.id}
                  onClick={() => handleToggle(r.id, r.active)}
                >
                  {toggleLoading === r.id
                    ? "..."
                    : r.active
                      ? "DESATIVAR"
                      : "ATIVAR"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: CONTADOR DE ACESSOS
// ─────────────────────────────────────────────────────────────────────────────

function AdminAccessCounter() {
  const [total, setTotal] = useState(null);

  useEffect(() => {
    fetchWithAuth("/access")
      .then((n) => setTotal(n))
      .catch(() => {});
  }, []);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 16,
        padding: "10px 20px",
        border: "1px solid var(--cyan)",
        background: "rgba(0,255,255,0.04)",
        marginBottom: 24,
      }}
    >
      <span
        className="font-['VT323'] text-xl"
        style={{ color: "var(--cyan)", textShadow: "var(--sc)" }}
      >
        📊 ACESSOS TOTAIS
      </span>
      <span
        className="font-['VT323'] text-3xl"
        style={{ color: "var(--yellow)", textShadow: "var(--sy)" }}
      >
        {total === null ? "..." : total.toLocaleString("pt-BR")}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA: ADMIN — PAINEL COMPLETO
// ─────────────────────────────────────────────────────────────────────────────

function AdminPage({ user, setPage }) {
  const [tab, setTab] = useState("questions");
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page, setPageNum] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [toast, setToast] = useState(null);

  const [userSearch, setUserSearch] = useState("");
  const [userResult, setUserResult] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="pg flex justify-center items-center">
        <div className="auth-box text-center">
          <p className="h1 mb-4">ACESSO NEGADO</p>
          <p
            className="font-['VT323'] text-xl mb-6"
            style={{ color: "var(--red)" }}
          >
            Você não tem permissão para acessar esta área.
          </p>
          <button className="btn bg" onClick={() => setPage("home")}>
            VOLTAR
          </button>
        </div>
      </div>
    );
  }

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPending = async (p = 0) => {
    setLoading(true);
    try {
      const data = await fetchWithAuth(`/questions/pending?page=${p}&size=5`);
      setQuestions(data.content || []);
      setTotalPages(data.totalPages || 1);
      setPageNum(p);
    } catch (err) {
      showToast(err.message || "Erro ao carregar questões.", "err");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "questions") fetchPending(0);
  }, [tab]);

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await fetchWithAuth(`/questions/${id}/approve`, { method: "PATCH" });
      showToast("Questão APROVADA com sucesso!", "ok");
      fetchPending(page);
    } catch (err) {
      showToast(err.message || "Erro ao aprovar.", "err");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      await fetchWithAuth(`/questions/${id}/reject`, { method: "PATCH" });
      showToast("Questão REJEITADA.", "err");
      fetchPending(page);
    } catch (err) {
      showToast(err.message || "Erro ao rejeitar.", "err");
    } finally {
      setActionLoading(null);
    }
  };

  const optColors = {
    A: "var(--cyan)",
    B: "var(--yellow)",
    C: "var(--magenta)",
    D: "var(--green)",
  };

  const searchUser = async () => {
    if (!userSearch.trim()) return;
    setUserLoading(true);
    setUserResult(null);
    try {
      const data = await fetchWithAuth(
        `/users/search?username=${encodeURIComponent(userSearch.trim())}`,
      );
      setUserResult(data);
    } catch (err) {
      showToast(err.message || "Usuário não encontrado.", "err");
    } finally {
      setUserLoading(false);
    }
  };

  const changeRole = async (userId, newRole) => {
    setRoleLoading(true);
    try {
      const data = await fetchWithAuth(
        `/users/${userId}/role?role=${newRole}`,
        { method: "PATCH" },
      );
      setUserResult(data);
      showToast(`Cargo alterado para ${newRole} com sucesso!`, "ok");
    } catch (err) {
      showToast(err.message || "Erro ao alterar cargo.", "err");
    } finally {
      setRoleLoading(false);
    }
  };

  return (
    <div className="pg">
      <p className="h1">PAINEL ADMIN</p>
      <div className="divpix" />

      {/* ── CONTADOR DE ACESSOS ── */}
      <AdminAccessCounter />

      {/* TABS */}
      <div
        style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}
      >
        {[
          ["questions", "⚙ QUESTÕES PENDENTES"],
          ["users", "👤 GERENCIAR USUÁRIOS"],
          ["regions", "🗺️ REGIÕES"],
        ].map(([t, label]) => (
          <button
            key={t}
            className={`cb${tab === t ? " on" : ""}`}
            onClick={() => setTab(t)}
            style={{ fontSize: 16 }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TOAST */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 80,
            right: 24,
            zIndex: 999,
            background: "var(--panel)",
            border: `1px solid ${toast.type === "ok" ? "var(--green)" : "var(--red)"}`,
            padding: "10px 20px",
            fontFamily: "VT323",
            fontSize: 20,
            color: toast.type === "ok" ? "var(--green)" : "var(--red)",
            textShadow: toast.type === "ok" ? "var(--sg)" : "var(--sr)",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* ── ABA: REGIÕES ── */}
      {tab === "regions" && <AdminRegionsTab showToast={showToast} />}

      {/* ── ABA: USUÁRIOS ── */}
      {tab === "users" && (
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <p className="sub" style={{ marginBottom: 16 }}>
            // Buscar invocador e alterar cargo
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <input
              className="fi"
              style={{ flex: 1, marginBottom: 0 }}
              placeholder="NOME DE INVOCADOR"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchUser()}
            />
            <button
              className="btn by sm"
              onClick={searchUser}
              disabled={userLoading}
            >
              {userLoading ? "..." : "BUSCAR"}
            </button>
          </div>
          {userResult && (
            <div className="auth-box" style={{ padding: "20px 24px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div>
                  <p
                    className="font-['VT323'] text-2xl"
                    style={{ color: "var(--fg)" }}
                  >
                    {userResult.username?.toUpperCase()}
                  </p>
                  <p
                    className="font-['VT323'] text-lg"
                    style={{ color: "var(--dim)" }}
                  >
                    {userResult.email}
                  </p>
                </div>
                <span
                  className="font-['VT323'] text-xl"
                  style={{
                    color:
                      userResult.role === "ADMIN"
                        ? "var(--yellow)"
                        : "var(--cyan)",
                    textShadow:
                      userResult.role === "ADMIN" ? "var(--sy)" : "var(--sc)",
                  }}
                >
                  {userResult.role}
                </span>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  className="btn bg"
                  style={{
                    flex: 1,
                    background: "rgba(0,255,65,0.08)",
                    borderColor: "var(--green)",
                    color: "var(--green)",
                  }}
                  disabled={roleLoading || userResult.role === "ADMIN"}
                  onClick={() => changeRole(userResult.id, "ADMIN")}
                >
                  {roleLoading ? "..." : "▲ PROMOVER A ADMIN"}
                </button>
                <button
                  className="btn br"
                  style={{ flex: 1 }}
                  disabled={roleLoading || userResult.role === "USER"}
                  onClick={() => changeRole(userResult.id, "USER")}
                >
                  {roleLoading ? "..." : "▼ REBAIXAR A USER"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ABA: QUESTÕES PENDENTES ── */}
      {tab === "questions" &&
        (loading ? (
          <p
            className="font-['VT323'] text-2xl text-center"
            style={{ color: "var(--yellow)" }}
          >
            CARREGANDO QUESTÕES PENDENTES...
          </p>
        ) : questions.length === 0 ? (
          <div
            className="auth-box text-center"
            style={{ maxWidth: 500, margin: "40px auto" }}
          >
            <p
              className="font-['VT323'] text-3xl"
              style={{ color: "var(--green)", textShadow: "var(--sg)" }}
            >
              ✓ NENHUMA QUESTÃO PENDENTE
            </p>
            <p
              className="font-['VT323'] text-xl mt-2"
              style={{ color: "var(--dim)" }}
            >
              Tudo revisado. Bom trabalho, admin!
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              maxWidth: 760,
              margin: "0 auto",
            }}
          >
            {questions.map((q) => (
              <div
                key={q.id}
                className="auth-box"
                style={{ padding: "20px 24px" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <span
                    className="font-['VT323'] text-lg"
                    style={{ color: "var(--dim)" }}
                  >
                    ID #{q.id} &nbsp;·&nbsp; REGIÃO:{" "}
                    {(q.region || "?").toUpperCase()} &nbsp;·&nbsp; DIFICULDADE:{" "}
                    {q.difficulty}/10
                  </span>
                  <span
                    className="font-['VT323'] text-lg"
                    style={{ color: "var(--yellow)", textShadow: "var(--sy)" }}
                  >
                    ● PENDING
                  </span>
                </div>

                <p
                  className="font-['VT323'] text-2xl mb-4"
                  style={{ color: "var(--fg)", lineHeight: 1.4 }}
                >
                  {q.statement}
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  {["A", "B", "C", "D"].map((opt) => (
                    <div
                      key={opt}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                        padding: "8px 10px",
                        border: `1px solid ${q.correctOption === opt ? "var(--green)" : "var(--border)"}`,
                        background:
                          q.correctOption === opt
                            ? "rgba(0,255,65,0.05)"
                            : "transparent",
                      }}
                    >
                      <span
                        className="font-['VT323'] text-xl"
                        style={{ color: optColors[opt], minWidth: 20 }}
                      >
                        {opt}
                      </span>
                      <span
                        className="font-['VT323'] text-xl"
                        style={{
                          color:
                            q.correctOption === opt
                              ? "var(--green)"
                              : "var(--dim)",
                          textShadow:
                            q.correctOption === opt ? "var(--sg)" : "none",
                        }}
                      >
                        {q[`option${opt}`]}
                        {q.correctOption === opt && " ✓"}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    className="btn bg"
                    style={{
                      flex: 1,
                      background: "rgba(0,255,65,0.08)",
                      borderColor: "var(--green)",
                      color: "var(--green)",
                    }}
                    disabled={actionLoading === q.id}
                    onClick={() => handleApprove(q.id)}
                  >
                    {actionLoading === q.id ? "..." : "✓ APROVAR"}
                  </button>
                  <button
                    className="btn br"
                    style={{ flex: 1 }}
                    disabled={actionLoading === q.id}
                    onClick={() => handleReject(q.id)}
                  >
                    {actionLoading === q.id ? "..." : "✗ REJEITAR"}
                  </button>
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-2">
                <button
                  className="btn bg sm"
                  disabled={page === 0}
                  onClick={() => fetchPending(page - 1)}
                >
                  ◀ ANTERIOR
                </button>
                <span
                  className="font-['VT323'] text-xl"
                  style={{ color: "var(--dim)" }}
                >
                  PÁGINA {page + 1} DE {totalPages}
                </span>
                <button
                  className="btn bg sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => fetchPending(page + 1)}
                >
                  PRÓXIMA ▶
                </button>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }

    // Se a URL contém ?token=, redireciona direto para a tela de reset de senha
    const params = new URLSearchParams(window.location.search);
    if (params.get("token")) {
      setPage("reset-password");
    }

    // Ping de acesso — registra visita sem armazenar dados pessoais
    fetchWithAuth("/access/ping", { method: "POST" }).catch(() => {});
  }, []);

  return (
    <div className="app">
      <Nav page={page} setPage={setPage} user={user} setUser={setUser} />
      {page === "home" && <HomePage setPage={setPage} />}
      {page === "quiz" && <QuizPage user={user} setPage={setPage} />}
      {page === "ranking" && <RankingPage user={user} />}
      {page === "auth" && <AuthPage setUser={setUser} setPage={setPage} />}
      {page === "suggest" && <SuggestPage user={user} setPage={setPage} />}
      {page === "about" && <AboutPage />}
      {page === "admin" && <AdminPage user={user} setPage={setPage} />}
      {page === "reset-password" && <ResetPasswordPage setPage={setPage} />}
    </div>
  );
}
