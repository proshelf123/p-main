import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; 
// IMPORTAÇÃO NOVA: Adicionado o deleteDoc
import { collection, getDocs, query, where, doc, updateDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  getAuth, 
} from 'firebase/auth';
import emailjs from '@emailjs/browser';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Configuração do Firebase necessária para o app secundário de criação de contas
const firebaseConfig = {
  apiKey: "AIzaSyD4EN941sdYO3uyTEhhj37mViV8t2Sgf8s",
  authDomain: "proshelf-8ecfd.firebaseapp.com",
  databaseURL: "https://proshelf-8ecfd-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "proshelf-8ecfd",
  storageBucket: "proshelf-8ecfd.firebasestorage.app",
  messagingSenderId: "814026747108",
  appId: "1:814026747108:web:efe59342c77f8c020990f1"
};

// Função para gerar uma senha aleatória de 8 caracteres
const gerarSenhaAleatoria = (tamanho = 8) => {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let senha = '';
  for (let i = 0; i < tamanho; i++) {
    senha += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return senha;
};

export default function AdminProShelf() {
  const [usuario, setUsuario] = useState(null);
  const [emailLogin, setEmailLogin] = useState('');
  const [senhaLogin, setSenhaLogin] = useState('');
  const [erroLogin, setErroLogin] = useState('');
  const [carregandoLogin, setCarregandoLogin] = useState(false);

  const [escolasPendentes, setEscolasPendentes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [processandoId, setProcessandoId] = useState(null);

  // Monitora se o admin está autenticado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      if (user) {
        carregarEscolasPendentes();
      }
    });
    return () => unsubscribe();
  }, []);

  // Função de Login do Admin
  const handleLogin = async (e) => {
    e.preventDefault();
    setErroLogin('');
    setCarregandoLogin(true);

    try {
      await signInWithEmailAndPassword(auth, emailLogin, senhaLogin);
    } catch (error) {
      console.error("Erro no login:", error);
      setErroLogin('E-mail ou palavra-passe incorretos.');
    } finally {
      setCarregandoLogin(false);
    }
  };

  // Função de Logout
  const handleLogout = async () => {
    await signOut(auth);
    setUsuario(null);
    setEscolasPendentes([]);
  };

  // Buscar escolas pendentes
  const carregarEscolasPendentes = async () => {
    try {
      setCarregando(true);
      const q = query(collection(db, "escolas"), where("status", "==", "pendente"));
      const querySnapshot = await getDocs(q);
      const lista = [];
      querySnapshot.forEach((docSnap) => {
        lista.push({ id: docSnap.id, ...docSnap.data() });
      });
      setEscolasPendentes(lista);
    } catch (error) {
      console.error("Erro ao carregar escolas pendentes:", error);
    } finally {
      setCarregando(false);
    }
  };

const handleAprovar = async (escola) => {
  if (!window.confirm(`Tem certeza que deseja aprovar a escola "${escola.nomeInstituicao}"?`)) return;

  setProcessandoId(escola.id);
  try {
    const senhaTemporaria = gerarSenhaAleatoria(8); // Usando a sua função para gerar senha de 8 caracteres

    // Chama a Cloud Function segura no Backend
    const functions = getFunctions();
    const aprovarEscola = httpsCallable(functions, 'aprovarEscola');
    
    await aprovarEscola({ 
      escolaId: escola.id, 
      senhaTemporaria: senhaTemporaria 
    });

    // Envia o e-mail pelo EmailJS apenas após o Firebase aprovar com sucesso
    const templateParams = {
      to_email: escola.email,
      to_name: escola.responsavel,
      nome_escola: escola.nomeInstituicao,
      senha_temp: senhaTemporaria,
    };

    await emailjs.send('proshelf', 'template_q6rlqso', templateParams, 'e1dAcW59wam10IXZC');

    alert(`Escola aprovada com sucesso e e-mail enviado para ${escola.email}!`);
    setEscolasPendentes(prev => prev.filter(e => e.id !== escola.id));
  } catch (error) {
    console.error("Erro ao aprovar escola:", error);
    // Se o backend retornar que o e-mail já existe (nosso tratamento anti-conflito)
    if (error.message.includes('already-exists')) {
      alert("Conflito: Já existe um coordenador ou escola utilizando este e-mail.");
    } else {
      alert("Erro ao aprovar escola: " + error.message);
    }
  } finally {
    setProcessandoId(null);
  }
};

// NOVA FUNÇÃO: Reprovar (Excluir) Escola
const handleReprovar = async (escola) => {
  if (!window.confirm(`Tem certeza que deseja reprovar e excluir a solicitação da escola "${escola.nomeInstituicao}"? Esta ação não pode ser desfeita.`)) return;

  setProcessandoId(escola.id);
  try {
    // 1. Exclui o documento da escola do Firestore
    const escolaRef = doc(db, "escolas", escola.id);
    await deleteDoc(escolaRef);

    alert(`Solicitação da escola "${escola.nomeInstituicao}" foi reprovada e excluída com sucesso!`);

    // 3. Remove da lista na tela
    setEscolasPendentes(prev => prev.filter(e => e.id !== escola.id));
  } catch (error) {
    console.error("Erro ao reprovar escola:", error);
    alert("Erro ao reprovar escola: " + error.message);
  } finally {
    setProcessandoId(null);
  }
};

  // Se o admin NÃO estiver logado, exibe a tela de login restrita
  if (!usuario) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f4f2f7',
        fontFamily: "'Poppins', sans-serif"
      }}>
        <form onSubmit={handleLogin} style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#6F3B9D', margin: '0 0 8px 0' }}>Admin ProShelf</h2>
            <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>Painel restrito a funcionários</p>
          </div>

          {erroLogin && (
            <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '8px', fontSize: '13px', textAlign: 'center' }}>
              {erroLogin}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#444' }}>E-mail de Administrador</label>
            <input
              type="email"
              value={emailLogin}
              onChange={(e) => setEmailLogin(e.target.value)}
              required
              placeholder="admin@proshelf.com"
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#444' }}>Palavra-passe</label>
            <input
              type="password"
              value={senhaLogin}
              onChange={(e) => setSenhaLogin(e.target.value)}
              required
              placeholder="••••••••"
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={carregandoLogin}
            style={{
              backgroundColor: '#6F3B9D',
              color: 'white',
              border: 'none',
              padding: '14px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: carregandoLogin ? 'not-allowed' : 'pointer',
              opacity: carregandoLogin ? 0.7 : 1,
              transition: 'background 0.2s',
              fontSize: '15px'
            }}
          >
            {carregandoLogin ? 'A entrar...' : 'Entrar no Painel'}
          </button>
        </form>
      </div>
    );
  }

  // Se estiver logado, exibe o painel de aprovações
  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto', fontFamily: "'Poppins', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ color: '#333', margin: '0 0 6px 0' }}>Painel do Administrador Geral</h1>
          <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>Logado como: <strong>{usuario.email}</strong></p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            backgroundColor: '#e53935',
            color: 'white',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          Terminar Sessão
        </button>
      </div>

      <h2 style={{ fontSize: '20px', color: '#444', marginBottom: '20px' }}>Escolas Pendentes de Aprovação</h2>

      {carregando ? (
        <p style={{ color: '#666' }}>A carregar escolas...</p>
      ) : escolasPendentes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9f9f9', borderRadius: '12px', color: '#777' }}>
          Não existem escolas pendentes no momento.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {escolasPendentes.map((escola) => (
            <div key={escola.id} style={{
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>{escola.nomeInstituicao}</h3>
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#555' }}><strong>Responsável:</strong> {escola.responsavel}</p>
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#555' }}><strong>E-mail:</strong> {escola.email}</p>
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#555' }}><strong>CNPJ:</strong> {escola.cnpj || 'Não informado'} | <strong>Telefone:</strong> {escola.telefone}</p>
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#555' }}><strong>Local:</strong> {escola.cidade} - {escola.estado}</p>
              </div>

              {/* Botões lado a lado */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => handleReprovar(escola)}
                  disabled={processandoId === escola.id}
                  style={{
                    backgroundColor: processandoId === escola.id ? '#ccc' : '#e53935',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: processandoId === escola.id ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Reprovar
                </button>
                <button
                  onClick={() => handleAprovar(escola)}
                  disabled={processandoId === escola.id}
                  style={{
                    backgroundColor: processandoId === escola.id ? '#ccc' : '#6F3B9D',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: processandoId === escola.id ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {processandoId === escola.id ? 'A processar...' : 'Aprovar Escola'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}