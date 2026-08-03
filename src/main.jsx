import { StrictMode, Suspense, lazy, useState, useEffect, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Route, BrowserRouter, Routes, useLocation } from "react-router"
import { AnimatePresence } from 'framer-motion'
import PageTransition from './transicao-de-paginas.jsx/transicao'
import { removerTemaVisual } from './tema'
import './global.css';

// Cada página vira um chunk separado — só é baixada quando a rota é acessada.
const Inicio          = lazy(() => import('./paginas/inicio'))
const InicioCelular   = lazy(() => import('./inicio-celular/inicio-celular'))
const Login           = lazy(() => import('./login/login'))
const Dashboard       = lazy(() => import('./dashboard/dashboard'))
const EsqueciSenha    = lazy(() => import('./esqueci-senha/esqueci-senha'))
const CadastrarEscola = lazy(() => import('./cadastrar-escola/cadastrar-escola'))
const Registro        = lazy(() => import('./registro/registro'))
const PrimeiroAcesso  = lazy(() => import('./primeiro-acesso/primeiro-acesso'))

// Fallback simples enquanto o chunk da rota carrega.
// Troque por um spinner/skeleton do seu design quando quiser.
function Carregando() {
  return <div style={{ minHeight: '100vh' }} />
}

function AnimatedRoutes() {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  useLayoutEffect(() => {
    if (location.pathname !== '/dashboard') removerTemaVisual()
  }, [location.pathname])

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<Carregando />}>
        <Routes location={location} key={location.pathname}>
          {/* Se for mobile, renderiza InicioCelular, senão, Inicio */}
          <Route
            path="/"
            element={
              <PageTransition>
                {isMobile ? <InicioCelular /> : <Inicio />}
              </PageTransition>
            }
          />

          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/esqueci-senha" element={<PageTransition><EsqueciSenha /></PageTransition>} />
          <Route path="/cadastrar-escola" element={<PageTransition><CadastrarEscola /></PageTransition>} />
          <Route path='/registro' element={<PageTransition><Registro /></PageTransition>} />
          <Route path="/primeiro-acesso" element={<PageTransition><PrimeiroAcesso /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

export default App;