import '../cadastrar-escola/cadastrar-escola.css'
import React, { useState, useRef } from 'react';
import LogoMetade from '../assets/Group 28.png';
import LogoIcone from '../assets/Group 32 (2).png';
import { Link, useNavigate } from 'react-router';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// 1. Importação do seu componente customizado
import DropdownComPortal from '../secoes/DropwdownComPortal';
import emailjs from '@emailjs/browser';

const ESTADOS = [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
    'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
    'RS','RO','RR','SC','SP','SE','TO'
];

function CadastroEscola() {
    const navigate = useNavigate();

    // 2. Estado para controlar qual dropdown está aberto
    const [dropdownAberto, setDropdownAberto] = useState(null);

    const [form, setForm] = useState({
        nomeInstituicao: '',
        cnpj: '',
        cep: '',
        estado: '',
        cidade: '',
        bairro: '',
        logradouro: '',
        email: '',
        telefone: '',
        responsavel: '',
    });

    const [status, setStatus] = useState({ tipo: '', mensagem: '' });
    const [carregando, setCarregando] = useState(false);
    const [sucesso, setSucesso] = useState(false);
    const [cepCarregando, setCepCarregando] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        let v = value;

        if (name === 'cnpj') {
            v = value.replace(/\D/g, '')
                .slice(0, 14)
                .replace(/^(\d{2})(\d)/, '$1.$2')
                .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                .replace(/\.(\d{3})(\d)/, '.$1/$2')
                .replace(/(\d{4})(\d)/, '$1-$2');
        }
        if (name === 'cep') {
            v = value.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
        }
        if (name === 'telefone') {
            v = value.replace(/\D/g, '').slice(0, 11)
                .replace(/^(\d{2})(\d)/, '($1) $2')
                .replace(/(\d{5})(\d)/, '$1-$2');
        }

        setForm(prev => ({ ...prev, [name]: v }));

        if (name === 'cep' && v.replace(/\D/g, '').length === 8) {
            buscarCep(v.replace(/\D/g, ''));
        }
    };

    const buscarCep = async (cepNumeros) => {
        setCepCarregando(true);
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cepNumeros}/json/`);
            const data = await res.json();
            if (!data.erro) {
                setForm(prev => ({
                    ...prev,
                    cidade: data.localidade || '',
                    bairro: data.bairro || '',
                    logradouro: data.logradouro || '',
                    estado: data.uf || '',
                }));
            }
        } catch (_) {}
        finally { setCepCarregando(false); }
    };

    const validar = () => {
        const obrigatorios = ['nomeInstituicao', 'cnpj', 'cep', 'estado', 'cidade', 'bairro', 'logradouro', 'email', 'telefone', 'responsavel'];
        for (const campo of obrigatorios) {
            if (!form[campo].trim()) {
                setStatus({ tipo: 'erro', mensagem: 'Preencha todos os campos obrigatórios.' });
                return false;
            }
        }
        if (!/\S+@\S+\.\S+/.test(form.email)) {
            setStatus({ tipo: 'erro', mensagem: 'E-mail inválido.' });
            return false;
        }
        if (form.cnpj.replace(/\D/g, '').length !== 14) {
            setStatus({ tipo: 'erro', mensagem: 'CNPJ inválido.' });
            return false;
        }
        return true;
    };

const handleCadastro = async (e) => {
        e?.preventDefault();
        setStatus({ tipo: '', mensagem: '' });
        if (!validar()) return;

        setCarregando(true);
        try {
            // Salva no Firebase primeiro
            await addDoc(collection(db, 'escolas'), {
                ...form,
                criadoEm: serverTimestamp(),
                status: 'pendente',
            });

            // 2. Configura os parâmetros que serão enviados para o template do EmailJS
            // As chaves do objeto devem bater com as variáveis {{variavel}} criadas no seu template
            const templateParams = {
                to_name: form.responsavel,
                to_email: form.email,
                nome_escola: form.nomeInstituicao,
                // Adicione outras variáveis aqui se precisar (ex: telefone, cnpj)
            };

            // 3. Dispara o e-mail
            // Substitua as strings abaixo pelas suas credenciais do EmailJS
            await emailjs.send(
                'proshelf',     // Ex: 'service_xyz123'
                'template_zqo10yi',    // Ex: 'template_abc456'
                templateParams,
                'e1dAcW59wam10IXZC'      // Ex: 'AbC_DeFgHiJkLmNo'
            );

            // Se tudo der certo, exibe a tela de sucesso
            setSucesso(true);
        } catch (error) {
            console.error('Erro no cadastro ou envio de e-mail:', error);
            setStatus({ tipo: 'erro', mensagem: 'Erro ao cadastrar. Tente novamente.' });
        } finally {
            setCarregando(false);
        }
    };

    return (
        <div className='pagina-login' onKeyDown={(e) => e.key === 'Enter' && handleCadastro()}>
            
            {/* Adicionando as variáveis CSS que o DropdownComPortal utiliza */}
            <style>{`
                :root {
                    --roxo: #6F3B9D;
                    --branco: #ffffff;
                    --borda: #cccccc;
                    --texto: #000000;
                }
                .perfil-label {
                    display: block;
                    margin-bottom: 8px;
                    font-size: 16px;
                    font-weight: 400;
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            <div className='lado-roxo'>
                <img src={LogoMetade} className='icone-login' alt="Ícone de login" />

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

            <div className='lado-branco' style={{ overflowY: 'auto', justifyContent: 'flex-start', paddingTop: '40px', paddingBottom: '40px' }}>
                <img src={LogoIcone} className='logo-login' alt="Logo" />
                <h2 id='acessar'>Cadastrar escola</h2>

                {sucesso ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
                        <svg width="90" height="90" viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
                            <style>{`
                                .cp { fill:none; stroke:#6F3B9D; stroke-width:3; opacity:.15; }
                                .cprog {
                                    fill:none; stroke:#6F3B9D; stroke-width:3; stroke-linecap:round;
                                    stroke-dasharray:251; stroke-dashoffset:251;
                                    transform:rotate(-90deg); transform-origin:50px 50px;
                                    animation:dc .6s cubic-bezier(.4,0,.2,1) .1s forwards;
                                }
                                .ck {
                                    fill:none; stroke:#6F3B9D; stroke-width:4;
                                    stroke-linecap:round; stroke-linejoin:round;
                                    stroke-dasharray:60; stroke-dashoffset:60;
                                    animation:dck .4s cubic-bezier(.4,0,.2,1) .75s forwards;
                                }
                                .pr {
                                    fill:none; stroke:#6F3B9D; stroke-width:2; opacity:0;
                                    transform-origin:50px 50px;
                                    animation:po 1s ease-out 1.1s forwards;
                                }
                                @keyframes dc  { to { stroke-dashoffset:0; } }
                                @keyframes dck { to { stroke-dashoffset:0; } }
                                @keyframes po  { 0%{opacity:.5;r:42px} 100%{opacity:0;r:62px} }
                            `}</style>
                            <circle className="cp"    cx="50" cy="50" r="40"/>
                            <circle className="pr"    cx="50" cy="50" r="42"/>
                            <circle className="cprog" cx="50" cy="50" r="40"/>
                            <polyline className="ck"  points="30,52 44,66 70,36"/>
                        </svg>
                        <p style={{ color: '#4CAF50', fontSize: '15px', fontWeight: '600', textAlign: 'center' }}>
                            Cadastro realizado com sucesso!
                        </p>
                        <p style={{ color: '#888', fontSize: '13px', textAlign: 'center', maxWidth: '280px' }}>
                            Sua escola foi cadastrada e está em análise. Em breve entraremos em contato.
                        </p>
                        <Link to='/login' className='btn-cadastrar' style={{ marginTop: '16px', textDecoration: 'none' }}>
                            Ir para o login <span className="arrow">›</span>
                        </Link>
                    </div>
                ) : (
                    <>
                        <p style={{ color: '#888', fontSize: '16px', textAlign: 'center', maxWidth: '340px', marginTop: '-8px' }}>
                            Preencha os dados abaixo para registrar sua instituição de ensino.
                        </p>

                        <div style={{ width: '80%', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                            <div className='campo' style={{ width: '100%' }}>
                                <label>Nome da Instituição *</label>
                                <input
                                    type="text"
                                    name="nomeInstituicao"
                                    placeholder="Digite o nome da escola"
                                    value={form.nomeInstituicao}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className='campo' style={{ width: '100%' }}>
                                <label>Responsável *</label>
                                <input
                                    type="text"
                                    name="responsavel"
                                    placeholder="Nome do responsável pela instituição"
                                    value={form.responsavel}
                                    onChange={handleChange}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div className='campo' style={{ width: '50%' }}>
                                    <label>E-mail *</label>
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="contato@escola.com.br"
                                        value={form.email}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className='campo' style={{ width: '50%' }}>
                                    <label>Telefone *</label>
                                    <input
                                        type="text"
                                        name="telefone"
                                        placeholder="(11) 99999-9999"
                                        value={form.telefone}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className='campo' style={{ width: '100%' }}>
                                <label>CNPJ *</label>
                                <input
                                    type="text"
                                    name="cnpj"
                                    placeholder="00.000.000/0000-00"
                                    value={form.cnpj}
                                    onChange={handleChange}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div className='campo' style={{ width: '50%' }}>
                                    <label>CEP * {cepCarregando && <span style={{ fontSize: '11px', color: '#6F3B9D' }}>Buscando...</span>}</label>
                                    <input
                                        type="text"
                                        name="cep"
                                        placeholder="00000-000"
                                        value={form.cep}
                                        onChange={handleChange}
                                    />
                                </div>
                                
                                {/* AQUI FOI SUBSTITUÍDO O SELECT PELO DROPDOWN */}
                                <div style={{ width: '50%'}}>
                                    <DropdownComPortal 
                                        label="Estado *"
                                        id="estado"
                                        opcoes={ESTADOS}
                                        valor={form.estado}
                                        onChange={(valor) => setForm(prev => ({ ...prev, estado: valor }))}
                                        dropdownAberto={dropdownAberto}
                                        setDropdownAberto={setDropdownAberto}
                                    />
                                </div>
                            </div>

                            <div className='campo' style={{ width: '100%' }}>
                                <label>Cidade *</label>
                                <input
                                    type="text"
                                    name="cidade"
                                    placeholder="Digite sua cidade"
                                    value={form.cidade}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className='campo' style={{ width: '100%' }}>
                                <label>Bairro *</label>
                                <input
                                    type="text"
                                    name="bairro"
                                    placeholder="Digite seu bairro"
                                    value={form.bairro}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className='campo' style={{ width: '100%' }}>
                                <label>Logradouro *</label>
                                <input
                                    type="text"
                                    name="logradouro"
                                    placeholder="Rua, Avenida, número..."
                                    value={form.logradouro}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {status.mensagem && (
                            <p style={{
                                color: '#e53935',
                                fontSize: '13px',
                                fontWeight: '500',
                                textAlign: 'center',
                                maxWidth: '340px',
                            }}>
                                {status.mensagem}
                            </p>
                        )}

                        <button
                            className='btn-cadastrar'
                            onClick={handleCadastro}
                            disabled={carregando}
                            style={{
                                opacity: carregando ? 0.7 : 1,
                                cursor: carregando ? 'not-allowed' : 'pointer',
                                width: '40%',
                            }}
                        >
                            {carregando ? 'Cadastrando...' : 'Cadastrar'}
                            {!carregando && <span className="arrow">›</span>}
                        </button>

                        <p style={{ fontSize: '14px' }}>
                            Já tem conta?{' '}
                            <Link to='/login' className='aqui'>Entrar</Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

export default CadastroEscola;