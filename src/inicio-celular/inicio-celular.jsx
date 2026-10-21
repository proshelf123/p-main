import './inicio-celular.css'
import { motion } from "framer-motion";
import { useNavigate } from 'react-router';
import LogoMobile from '../assets/Group-44.webp'

export default function InicioMobile() {
  const navigate = useNavigate();

  return (
    <div className="im-wrapper">

      {/* Header */}
      <header className="im-header">
        <img
          src={LogoMobile}
          alt="ProShelf"
          className="im-logo-header"
          loading="lazy"
          decoding="async"
        />
      </header>

      {/* Hero */}
      <section className="im-hero">
        <div className="im-hero-img" />
        <div className="im-hero-texto">
          <h1 className="im-titulo">
            A estante{" "}
            <span className="im-inteligente">
              <span className="im-com-barra">
                inteli
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
                  className="im-barra-animada"
                  style={{ transformOrigin: "left" }}
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
                  style={{ transformOrigin: "left" }}
                />
              </span>
            </span>
            <br />
            do professor
          </h1>
          <p className="im-hero-desc">
            Descomplique a gestão pedagógica com uma plataforma feita por
            quem entende o dia a dia da sala de aula
          </p>
        </div>
      </section>

      {/* Seção branca */}
      <section className="im-secao-branca">
        <div className="im-secao-branca-conteudo">
          <h2 className="im-subtitulo">
            Docência de{" "}
            <span className="im-impacto">
              impacto
              <span className="im-barra-fixa" />
            </span>{" "}
            sem o peso do cansaço
          </h2>

          <p className="im-texto-corpo">
            Reinvente e descomplique a sua gestão pedagógica com uma
            tecnologia desenvolvida por quem vive a realidade e entende o
            ritmo do professor, permitindo que você monte, ajuste e envie
            materiais e provas em instantes para conquistar total liberdade
            na sua agenda.
          </p>

          <div className="im-cta-linha">
            <span className="im-cta-label">
              Descomplique sua rotina hoje
              <span className="im-barra-fixa" />
            </span>

            <motion.button
              className="im-botao"
              onClick={() => navigate("/login")}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.4 }}
              whileTap={{ scale: 0.96 }}
            >
              Começar agora
            </motion.button>
          </div>
        </div>
      </section>

      {/* Seção laranja */}
      <section className="im-secao-laranja">
        <div className="im-secao-laranja-texto">
          <h2 className="im-titulo-laranja">
            Menos caos na rotina, mais LEVEZA ao ensinar
          </h2>
          <p className="im-texto-laranja">
            Crie, personalize e compartilhe aulas e avaliações completas em
            minutos, assumindo o controle total do seu tempo e da sua
            rotina.
          </p>
        </div>
        <div className="im-secao-laranja-img" />
      </section>

    </div>
  );
}