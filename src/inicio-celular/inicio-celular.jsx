import './inicio-celular.css'
import { motion } from "framer-motion";
import { useNavigate } from 'react-router';
import LogoMobile from '../assets/Group-44.webp'
// import { Link } from "react-router" <-- Removido (não estava sendo usado)

export default function InicioMobile() {
  const navigate = useNavigate();

  return (
      <div className="im-wrapper">

      {/* Círculos laranja */}
      <div className="im-circulo-laranja" />
      <div className="im-circulo-amarelo" />

      {/* Conteúdo principal */}
      <main className="im-main">
        <h1 className="im-titulo">
          A estante {" "}   
        
          <span className="im-inteligente">
            <span className="im-com-barra">
              inteli
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
                className="im-barra-animada"
                style={{ transformOrigin: "left" }} /* Evita o reflow forçado na animação */
              />
            </span>
            <span className="im-sem-barra">g</span>
            <span className="im-com-barra">
              ente
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.8 }}
                className="im-barra-animada"
                style={{ transformOrigin: "left" }} /* Evita o reflow forçado na animação */
              />
            </span>
          </span>
          
          {" "}do professor
        </h1>

      <motion.button
        className="im-botao"
        onClick={() => navigate("/login")}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 1.0 }}
        whileTap={{ scale: 0.96 }}
      >
        Entrar
      </motion.button>

      </main>

      {/* Footer com logo */}
      <footer className="im-footer">
        <img 
          src={LogoMobile} 
          alt="ProShelf" 
          className="im-logo-footer" 
          width="150" /* Substitua pela largura real em pixels da sua logo */
          height="50" /* Substitua pela altura real em pixels da sua logo */
          loading="lazy" /* Só baixa a imagem quando o scroll chegar perto */
          decoding="async" /* Evita que a imagem trave o JavaScript principal */
        />
      </footer>

    </div>
  );
}