import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router';
import './primeiro-acesso.css';
import LogoMetade from '../assets/Group 28.png'
import LogoIcone from "../assets/Group 32 (2).png"
import { auth } from "../firebase";
import { signInWithEmailAndPassword, updatePassword } from "firebase/auth";

// ─── Partículas e brilhos (idênticos ao login) ───────────────────────────────
function LadoRoxo() {
    return (
        <div className="lado-roxo">
            <img src={LogoMetade} className="icone-login" alt="Ícone" />
            <div className="icone-login-placeholder" aria-hidden="true" />

            {[...Array(12)].map((_, i) => (
                <span
                    key={`p${i}`}
                    className="particula"
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
                    className="brilho-linha"
                    style={{
                        top: `${y}%`,
                        animationDelay:    `${i * 3}s`,
                        animationDuration: `${8 + i * 2}s`,
                    }}
                />
            ))}
        </div>
    );
}

// ─── Validação da senha ───────────────────────────────────────────────────────
function validarSenha(senha) {
    return {
        minLength:   senha.length >= 8,
        maiuscula:   /[A-Z]/.test(senha),
        numero:      /[0-9]/.test(senha),
    };
}

// ─── Regra individual ─────────────────────────────────────────────────────────
function RegraItem({ ok, texto }) {
    return (
        <motion.li
            className={`regra-item ${ok ? 'regra-ok' : ''}`}
            animate={{ color: ok ? '#6F3B9D' : '#888' }}
            transition={{ duration: 0.3 }}
        >
            <span className="regra-icone">{ok ? '✓' : '•'}</span>
            {texto}
        </motion.li>
    );
}

// ─── ETAPA 1 — credenciais temporárias ───────────────────────────────────────
function Etapa1({ onProximo }) {
    const [identificador, setIdentificador] = useState('');
    const [senhaTemp, setSenhaTemp]         = useState('');
    const [carregando, setCarregando]       = useState(false);
    const [erro, setErro]                   = useState('');

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (!identificador || !senhaTemp) {
            setErro('Preencha todos os campos.');
            return;
        }
        setErro('');
        setCarregando(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, identificador, senhaTemp);
            onProximo(userCredential.user);
            onProximo({ email: identificador }); // passe o user real do Firebase
        } catch (error) {
            if (error.code === 'auth/invalid-credential') {
                setErro('E-mail/usuário ou senha temporária incorretos.');
            } else {
                setErro('Ocorreu um erro. Tente novamente.');
            }
        } finally {
            setCarregando(false);
        }
    };

    return (
        <motion.div
            className="lado-branco"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
            <img src={LogoIcone} className="logo-login" alt="Logo" />
            <div className="logo-placeholder" aria-label="Logo ProShelf" />

            <h2 id="acessar">Primeiro acesso</h2>
            <p className="subtitulo">Acesso disponibilizado pela coordenação</p>

            {erro && (
                <motion.p
                    className="msg-erro"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {erro}
                </motion.p>
            )}

            <div className="campo">
                <label>E-mail ou nome de usuário</label>
                <input
                    type="text"
                    placeholder="Digite seu e-mail ou nome de usuário"
                    value={identificador}
                    onChange={e => setIdentificador(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    autoComplete="username"
                />
            </div>

            <div className="campo">
                <label>Senha (disponibilizada pela coordenação)</label>
                <input
                    type="password"
                    placeholder="Digite a senha"
                    value={senhaTemp}
                    onChange={e => setSenhaTemp(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    autoComplete="current-password"
                />
            </div>

            <button
                className="btn-entrar"
                onClick={handleSubmit}
                disabled={carregando}
            >
                {carregando ? 'Verificando…' : 'Entrar'}
                {!carregando && <span className="arrow">›</span>}
            </button>

            <Link to="/login" className="link-voltar">Voltar</Link>
        </motion.div>
    );
}

// ─── ETAPA 2 — redefinição de senha ──────────────────────────────────────────
function Etapa2({ user, onConcluido }) {
    const [novaSenha,       setNovaSenha]       = useState('');
    const [confirmaSenha,   setConfirmaSenha]   = useState('');
    const [carregando,      setCarregando]      = useState(false);
    const [erro,            setErro]            = useState('');

    const regras  = validarSenha(novaSenha);
    const tudo_ok = Object.values(regras).every(Boolean);
    const senhasIguais = novaSenha === confirmaSenha && confirmaSenha.length > 0;

    const handleRedefinir = async (e) => {
        e?.preventDefault();
        if (!tudo_ok) {
            setErro('A senha não cumpre todos os requisitos.');
            return;
        }
        if (!senhasIguais) {
            setErro('As senhas não coincidem.');
            return;
        }
        setErro('');
        setCarregando(true);

        try {
            await updatePassword(user, novaSenha);
        } catch (error) {
            setErro('Não foi possível redefinir a senha. Tente novamente.');
        } finally {
            setCarregando(false);
        }
    };

    return (
        <motion.div
            className="lado-branco"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
         <img src={LogoIcone} className="logo-login" alt="Logo" /> 
            <div className="logo-placeholder" aria-label="Logo ProShelf" />

            <h2 id="acessar">Primeiro acesso</h2>

            {erro && (
                <motion.p
                    className="msg-erro"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {erro}
                </motion.p>
            )}

            <div className="campo">
                <label>Redefina sua senha</label>
                <input
                    type="password"
                    placeholder="Digite sua nova senha"
                    value={novaSenha}
                    onChange={e => setNovaSenha(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRedefinir()}
                    autoComplete="new-password"
                />
            </div>

            <div className="campo">
                <label>Confirme a senha</label>
                <input
                    type="password"
                    placeholder="Confirme a senha"
                    value={confirmaSenha}
                    onChange={e => setConfirmaSenha(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRedefinir()}
                    autoComplete="new-password"
                    className={confirmaSenha.length > 0 ? (senhasIguais ? 'input-ok' : 'input-erro') : ''}
                />

                {confirmaSenha.length > 0 && !senhasIguais && (
                    <motion.span
                        className="aviso-inline"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        As senhas não coincidem
                    </motion.span>
                )}
            </div>

            <ul className="regras-lista">
                <li className="regras-titulo">Sua senha deve ter:</li>
                <RegraItem ok={regras.minLength} texto="No mínimo 8 caracteres" />
                <RegraItem ok={regras.maiuscula}  texto="Sendo uma letra maiúscula" />
                <RegraItem ok={regras.numero}     texto="Número(s)" />
            </ul>

            <button
                className="btn-entrar"
                onClick={handleRedefinir}
                disabled={carregando || !tudo_ok || !senhasIguais}
            >
                {carregando ? 'Salvando…' : 'Entrar'}
                {!carregando && <span className="arrow">›</span>}
            </button>

            <Link to="/login" className="link-voltar">Voltar</Link>
        </motion.div>
    );
}

// ─── ETAPA 3 — confirmação de sucesso ────────────────────────────────────────
function Etapa3() {
    return (
        <motion.div
            className="lado-branco"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
        >
            <div className="logo-placeholder" aria-label="Logo ProShelf" />
            <motion.div
                className="icone-sucesso"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
                ✓
            </motion.div>
            <h2 id="acessar">Senha redefinida!</h2>
            <p className="subtitulo">Seu acesso está pronto. Faça login com a nova senha.</p>
            <Link to="/login">
                <button className="btn-entrar" style={{ marginTop: 20 }}>
                    Ir para o login <span className="arrow">›</span>
                </button>
            </Link>
        </motion.div>
    );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
function PrimeiroAcesso() {
    const [etapa, setEtapa] = useState(1); // 1 | 2 | 3
    const [user,  setUser]  = useState(null);

    return (
        <div className="pagina-login">
            <LadoRoxo />

            <AnimatePresence mode="wait">
                {etapa === 1 && (
                    <Etapa1
                        key="etapa1"
                        onProximo={(u) => { setUser(u); setEtapa(2); }}
                    />
                )}
                {etapa === 2 && (
                    <Etapa2
                        key="etapa2"
                        user={user}
                        onConcluido={() => setEtapa(3)}
                    />
                )}
                {etapa === 3 && (
                    <Etapa3 key="etapa3" />
                )}
            </AnimatePresence>
        </div>
    );
}

export default PrimeiroAcesso;