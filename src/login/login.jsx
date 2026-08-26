import styles from "./login.module.css";
import React, { useState, useEffect } from "react";
import LogoMetade from "../assets/Group 28.png";
import LogoIcone from "../assets/Group 32 (2).png";
import { Email } from "@smastrom/react-email-autocomplete";

// 👇 IMPORTAÇÕES ATUALIZADAS 👇
import { auth, functions } from "../firebase";
import {
  signInWithCustomToken,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged
} from "firebase/auth"; // Importamos as regras de persistência
import { httpsCallable } from "firebase/functions";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erroLogin, setErroLogin] = useState("");
  const [animacaoErro, setAnimacaoErro] = useState(0);

  // 👇 NOVO ESTADO: Começa marcado como "true" (Lembrar de mim ativado por padrão)
  const [lembrar, setLembrar] = useState(true);

  useEffect(() => {
    // Fica escutando se existe uma sessão ativa salva no navegador
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Se já estiver logado, joga direto pro dashboard sem precisar digitar senha
        navigate("/dashboard");
      }
    });

    // Limpa o observador quando o componente for desmontado
    return () => unsubscribe();
  }, [navigate]);

  const mostrarErro = (mensagem) => {
    setErroLogin(mensagem);
    setAnimacaoErro((valorAtual) => valorAtual + 1);
  };

  const dominiosEmail = [
    'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 
    'uol.com.br', 'bol.com.br', 'terra.com.br', 'ig.com.br'
  ];

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !senha) {
      mostrarErro("Por favor, preencha o e-mail e a senha.");
      return;
    }

    try {
      setErroLogin("");

      // 👇 PASSO 1: Define como o Firebase vai salvar a sessão ANTES de logar
      const tipoPersistencia = lembrar ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, tipoPersistencia);

      // 2. Prepara a conexão com a nossa Função Blindada
      const loginSeguro = httpsCallable(functions, "loginComLimite");

      // 3. Envia os dados para a função avaliar
      const result = await loginSeguro({
        email: email,
        senha: senha,
      });

      // 4. Se a função aprovar, ela devolve um Token Customizado. Usamos ele para entrar.
      await signInWithCustomToken(auth, result.data.customToken);

      navigate("/dashboard");

    } catch (error) {
      console.error("Erro ao logar:", error);

      if (error.code === "functions/resource-exhausted") {
        mostrarErro("Muitas tentativas. Tente novamente em 15 minutos.");
      }
      else if (error.code === "functions/permission-denied") {
        mostrarErro("E-mail ou senha incorretos.");
      }
      else if (error.code === "functions/unauthenticated") {
        mostrarErro("O seu navegador bloqueou a verificação de segurança (reCAPTCHA). Tente por outro navegador.");
      }
      else {
        mostrarErro("Ocorreu um erro ao tentar entrar. Tente novamente.");
      }
    }
  };

  return (
    <>
      <div
        className={styles["pagina-login"]}
        onKeyDown={(e) => e.key === "Enter" && handleLogin(e)}
      >
        <div className={styles["lado-roxo"]}>
          {/* ... (Todo o seu código de animação foi mantido igual) ... */}
          <Link to="/" />
          <img
            src={LogoMetade}
            className={styles["icone-login"]}
            alt="Ícone de login"
          />

          {[...Array(12)].map((_, i) => (
            <span
              key={`p${i}`}
              className={styles.particula}
              style={{
                left: `${8 + i * 7.5}%`,
                width: i % 3 === 0 ? "5px" : "3px",
                height: i % 3 === 0 ? "5px" : "3px",
                animationDelay: `${(i * 0.8) % 6}s`,
                animationDuration: `${6 + (i % 4)}s`,
              }}
            />
          ))}

          {[20, 45, 70].map((y, i) => (
            <span
              key={`b${i}`}
              className={styles["brilho-linha"]}
              style={{
                top: `${y}%`,
                animationDelay: `${i * 3}s`,
                animationDuration: `${8 + i * 2}s`,
              }}
            />
          ))}
        </div>

        <div className={styles["lado-branco"]}>
          <Link to="/" className={styles["btn-voltar"]}>
            <ArrowLeft size={20} /> Voltar
          </Link>

          <img src={LogoIcone} className={styles["logo-login"]} alt="Logo" />
          <h2 id={styles.acessar}>Acessar a plataforma</h2>

          <div className={styles["form-wrapper"]}>
            <div className={styles.campo}>
              <label>E-mail</label>
<Email
            classNames={{
              wrapper: styles["email-wrapper"],
              input: erroLogin ? styles["input-login-erro"] : "",
              dropdown: styles["email-dropdown"],
              suggestion: styles["email-suggestion"],
            }}
            baseList={dominiosEmail}
            type="email"
            placeholder="Digite seu e-mail"
            value={email}
            aria-invalid={erroLogin ? "true" : "false"}
            onChange={(valorAtualizado) => {
              // A biblioteca retorna a string diretamente, então não precisa de "e.target.value"
              setEmail(valorAtualizado);
              setErroLogin("");
            }}
          />
            </div>

            <div className={styles.campo}>
              <label>Senha</label>
              <input
                type="password"
                placeholder="Digite sua senha"
                value={senha}
                className={erroLogin ? styles["input-login-erro"] : ""}
                aria-invalid={erroLogin ? "true" : "false"}
                aria-describedby={erroLogin ? "erro-login" : undefined}
                onChange={(e) => {
                  setSenha(e.target.value);
                  setErroLogin("");
                }}
              />
              {erroLogin && (
                <div
                  key={animacaoErro}
                  id="erro-login"
                  className={styles["mensagem-login-erro"]}
                  role="alert"
                >
                  <span aria-hidden="true">!</span>
                  {erroLogin}
                </div>
              )}

              {/* 👇 ADICIONADO: Opções abaixo da senha (Checkbox e Esqueci Senha) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <label className={styles["toggle-lembrar"]}>
                  <input
                    type="checkbox"
                    className={styles["toggle-input"]}
                    checked={lembrar}
                    onChange={(e) => setLembrar(e.target.checked)}
                  />
                  <span className={styles["toggle-track"]}>
                    <span className={styles["toggle-thumb"]}></span>
                  </span>
                  Lembrar de mim
                </label>

                <Link to="/esqueci-senha" className={styles.esqueci} style={{ marginTop: '0' }}>
                  Esqueci minha senha
                </Link>
              </div>
            </div>

            <button className={styles["btn-entrar"]} onClick={handleLogin}>
              Entrar
              <span className={styles.arrow}>›</span>
            </button>
          </div>

          <p>
            Se esse for o seu primeiro acesso, clique{" "}
            <Link to="/primeiro-acesso" className={styles.aqui}>
              Aqui.
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

export default Login;