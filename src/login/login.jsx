import styles from "./login.module.css";
import React, { useState } from "react";
import LogoMetade from "../assets/Group 28.png";
import LogoIcone from "../assets/Group 32 (2).png";

// 👇 IMPORTAÇÕES ALTERADAS 👇
import { auth, functions } from "../firebase"; // Importe o 'functions' do seu arquivo firebase.js
import { signInWithCustomToken } from "firebase/auth";
import { httpsCallable } from "firebase/functions"; 
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erroLogin, setErroLogin] = useState("");
  const [animacaoErro, setAnimacaoErro] = useState(0);

  const mostrarErro = (mensagem) => {
    setErroLogin(mensagem);
    setAnimacaoErro((valorAtual) => valorAtual + 1);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    // Validação rápida no front para evitar gastar requisições à toa
    if (!email || !senha) {
      mostrarErro("Por favor, preencha o e-mail e a senha.");
      return;
    }

    try {
      setErroLogin("");
      
      // 1. Prepara a conexão com a nossa Função Blindada
      const loginSeguro = httpsCallable(functions, "loginComLimite");
      
      // 2. Envia os dados para a função avaliar (IP, email, senha)
      const result = await loginSeguro({ 
        email: email, 
        senha: senha,
      });

      // 3. Se a função aprovar, ela devolve um Token Customizado. Usamos ele para entrar.
      await signInWithCustomToken(auth, result.data.customToken);
      
      navigate("/dashboard");

    } catch (error) {
      console.error("Erro ao logar:", error);

      if (error.code === "functions/resource-exhausted") {
        mostrarErro("Muitas tentativas. Tente novamente em 15 minutos.");
      } 
      // 👇 AGORA ELE LÊ O ERRO CERTO DE SENHA
      else if (error.code === "functions/permission-denied") {
        mostrarErro("E-mail ou senha incorretos.");
      } 
      // 👇 SE FOR ERRO DE APP CHECK, ELE AVISA
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
            <ArrowLeft size={20}/> Voltar
          </Link>
          
          <img src={LogoIcone} className={styles["logo-login"]} alt="Logo" />
          <h2 id={styles.acessar}>Acessar a plataforma</h2>
          
          <div className={styles["form-wrapper"]}>
            <div className={styles.campo}>
              <label>E-mail</label>
              <input
                type="email"
                placeholder="Digite seu e-mail"
                value={email}
                className={erroLogin ? styles["input-login-erro"] : ""}
                aria-invalid={erroLogin ? "true" : "false"}
                onChange={(e) => {
                  setEmail(e.target.value);
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
              <Link to="/esqueci-senha" className={styles.esqueci}>
                Esqueci minha senha
              </Link>
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