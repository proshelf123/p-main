import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Route, BrowserRouter, Routes, useLocation } from "react-router"
import { AnimatePresence } from 'framer-motion'
import Inicio from './paginas/inicio'
import Login from './login/login'
import Dashboard from './dashboard/dashboard'
import PageTransition from './transicao-de-paginas.jsx/transicao'
import EsqueciSenha from './esqueci-senha/esqueci-senha'
import CadastrarEscola from './cadastrar-escola/cadastrar-escola'
import Registro from './registro/registro'
import PrimeiroAcesso from './primeiro-acesso/primeiro-acesso'
import InicioCelular from './inicio-celular/inicio-celular'

function AnimatedRoutes() {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Aqui está a mágica: se for mobile, renderiza InicioCelular, senão, Inicio */}
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