import styles from './loginMobile.module.css'; // <-- Importação do novo CSS mobile
import React, { useState } from 'react';
import LogoMetade from '../assets/Group 28.webp';
import LogoIcone from "../assets/Group 32 (2).webp";
import { auth } from "../firebase"; 
import { signInWithEmailAndPassword } from "firebase/auth";
import { Link, useNavigate } from 'react-router-dom';

function LoginMobile() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [erroLogin, setErroLogin] = useState('');
    const [animacaoErro, setAnimacaoErro] = useState(0);

    const mostrarErro = (mensagem) => {
        setErroLogin(mensagem);
        setAnimacaoErro((valorAtual) => valorAtual + 1);
    };

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            setErroLogin('');
            await signInWithEmailAndPassword(auth, email, senha);
            navigate('/dashboard');
        } catch (error) {
            const errorCode = error.code;
            console.error("Erro ao logar:", errorCode);
            
            if (errorCode === 'auth/invalid-credential') {
                mostrarErro("E-mail ou senha incorretos.");
            } else {
                mostrarErro("Ocorreu um erro ao entrar. Tente novamente.");
            }
        }
    };

    return (
        <div className={styles['pagina-login']} onKeyDown={(e) => e.key === 'Enter' && handleLogin(e)}>
            {/* ── Topo Roxo (Header Mobile) ── */}
            <div className={styles['lado-roxo']}>
                <Link to='/' />
                <img src={LogoMetade} className={styles['icone-login']} alt="Ícone de login" />

                {[...Array(12)].map((_, i) => (
                    <span
                        key={`p${i}`}
                        className={styles.particula}
                        style={{
                            left: `${8 + i * 7.5}%`,
                            width:  i % 3 === 0 ? '5px' : '3px',
                            height: i % 3 === 0 ? '5px' : '3px',
                            animationDelay:    `${(i * 0.8) % 6}s`,
                            animationDuration: `${6 + (i % 4)}s`,
                        }}
                    />
                ))}

                {[20, 45, 70].map((y, i) => (
                    <span
                        key={`b${i}`}
                        className={styles['brilho-linha']}
                        style={{
                            top: `${y}%`,
                            animationDelay:    `${i * 3}s`,
                            animationDuration: `${8 + i * 2}s`,
                        }}
                    />
                ))}
            </div>

            {/* ── Corpo Branco (Formulário Mobile) ── */}
            <div className={styles['lado-branco']}>
                <img src={LogoIcone} className={styles['logo-login']} alt="Logo" />
                <h2 className={styles.acessar}>Acessar a plataforma</h2>

                <div className={styles.campo}>
                    <label>E-mail</label>
                    <input 
                        type="email" 
                        placeholder='Digite seu e-mail' 
                        value={email}
                        className={erroLogin ? styles['input-login-erro'] : ''}
                        aria-invalid={erroLogin ? 'true' : 'false'}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setErroLogin('');
                        }}
                    />
                </div>

                <div className={styles.campo}>
                    <label>Senha</label>
                    <input 
                        type="password" 
                        placeholder='Digite sua senha' 
                        value={senha}
                        className={erroLogin ? styles['input-login-erro'] : ''}
                        aria-invalid={erroLogin ? 'true' : 'false'}
                        aria-describedby={erroLogin ? 'erro-login' : undefined}
                        onChange={(e) => {
                            setSenha(e.target.value);
                            setErroLogin('');
                        }}
                    />
                    {erroLogin && (
                        <div
                            key={animacaoErro}
                            id="erro-login"
                            className={styles['mensagem-login-erro']}
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

                <button className={styles['btn-entrar']} onClick={handleLogin}>
                    Entrar
                    <span className={styles.arrow}>›</span>
                </button>

                <p className={styles['texto-rodape']}>
                    Primeiro acesso? Clique <Link to="/primeiro-acesso" className={styles.aqui}>Aqui.</Link>
                </p>
            </div>
        </div>
    );
}

export default LoginMobile;