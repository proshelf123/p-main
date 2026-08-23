import React from 'react';
import styles from './inicio.module.css'; //
import { motion } from "framer-motion"; //[cite: 1]
import { Link, useNavigate } from 'react-router-dom'; //[cite: 1]
import { UserRoundPlus, School } from 'lucide-react';

// IMPORTANTE: Atualize os caminhos abaixo com as imagens reais do seu projeto
import Logo from '../assets/Group 32 (2).png';
import ImagemProfessores from '../assets/image 21.png';
import ImagemAlunos from '../assets/image 20.png';
import IconeEscola from '../assets/Union.png';

// Variáveis de animação mantidas do protótipo original[cite: 1]
const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04 },
  },
};

const letter = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

function Inicio() {
  const navigate = useNavigate(); //[cite: 1]

  // Função auxiliar para renderizar texto animado
  const renderAnimatedText = (text) => (
    text.split("").map((char, index) => (
      <motion.span key={index} variants={letter}>
        {char === " " ? "\u00A0" : char}
      </motion.span>
    ))
  );

  return (
    <div className={styles.paginaContainer}>
      {/* CABEÇALHO */}
      <header className={styles.cabecalho}>
        <div className={styles.logoContainer}>
          <Link to="/">
            <img src={Logo} className={styles.logo} alt="ProShelf Logo" />
          </Link>
        </div>

        <nav>
          <ul className={styles.ul}>
            <motion.li whileHover={{ scale: 1.05 }} className={styles.menuItem}>
              <Link to="/cadastrar-escola" className={styles.linkMenu}>
                <motion.span variants={container} initial="hidden" animate="visible" className={styles.textoMenu}>
                  {renderAnimatedText("Cadastrar Nova Escola")}
                </motion.span>
                      <School color="#331C48" size={30} strokeWidth={1.75} alt="Ícone" style={{ marginLeft: '8px' }} />
              </Link>
            </motion.li>

            <motion.li whileHover={{ scale: 1.05 }} className={styles.menuItem}>
              <Link to="/login" className={styles.linkMenu}>
                <motion.span variants={container} initial="hidden" animate="visible" className={styles.textoMenu}>
                  {renderAnimatedText("Área da Escola")}
                </motion.span>
                <img src={IconeEscola} className={styles.iconeMenu} alt="Ícone" />
              </Link>
            </motion.li>

            <motion.li whileHover={{ scale: 1.05 }} className={styles.menuItem}>
              <Link to="/login" className={styles.linkMenu}>
                <motion.span variants={container} initial="hidden" animate="visible" className={styles.textoMenu}>
                  {renderAnimatedText("Área do Professor")}
                </motion.span>
                <UserRoundPlus color="#331C48" size={30} strokeWidth={2} alt="Ícone" style={{ marginLeft: '8px' }} />
              </Link>
            </motion.li>
          </ul>
        </nav>
      </header>

      <main>
        {/* SEÇÃO 1: HERO (Professores + Fundo Roxo) */}
        <section className={styles.heroSection}>
          <div className={styles.heroImagemDiv}>
            <img src={ImagemProfessores} alt="Professores reunidos" className={styles.imagemCapa} />
          </div>
          <div className={styles.heroTextoDiv}>
            <h1 className={styles.tituloPrincipal}>
              A estante{" "}
              <span className={styles.inteligente}>
                <span className={styles.comBarra}>inteli
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
                    className={styles.barraAnimada} />
                </span>
                <span className={styles.semBarra}>g</span>
                <span className={styles.comBarra}>ente
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.8 }}
                    className={styles.barraAnimada} />
                </span>
              </span>{" "}
              <br /> do professor
            </h1>
            <p className={styles.paragrafoRoxo}>
              Descomplique a gestão pedagógica com uma plataforma feita por quem entende o dia a dia da sala de aula.
            </p>
          </div>
        </section>

        <div className={styles.separadorHorizontal}></div>


        {/* SEÇÃO 2: DOCÊNCIA DE IMPACTO (Branca) */}
        <section className={styles.impactoSection}>
          <h2 className={styles.tituloSecundario}>
            Docência de{" "}
            <span className={styles.palavraAnimada}>
              <span className={styles.comBarra}>im
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
                  className={styles.barraAnimadaImpacto}
                />
              </span>
              <span className={styles.semBarra}>p</span>
              <span className={styles.comBarra}>acto
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.8 }}
                  className={styles.barraAnimadaImpactoDireita} /* <-- NOVA CLASSE AQUI */
                />
              </span>
            </span>{" "}
            sem o peso do cansaço
          </h2>

          <div className={styles.impactoConteudo}>
            <div className={styles.impactoTexto}>
              <p>
                Reinvente e descomplique a sua gestão pedagógica com uma tecnologia desenvolvida por quem vive a realidade e entende o ritmo do professor, permitindo que você monte, ajuste e envie materiais e provas em instantes para conquistar total liberdade na sua agenda.
              </p>
            </div>

            <div className={styles.impactoAcao}>
              <div className={styles.containerSubtitulo}>
                <h3 className={styles.subtituloAcao}>Descomplique sua rotina hoje</h3>
                <motion.div
                  initial={{ scaleX: 0 }} /* Trocamos width por scaleX */
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                  className={styles.barraAnimadaAcao}
                />
              </div>          
              <motion.button
                onClick={() => navigate("/login")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={styles.botaoComecar}>
                Começar agora
              </motion.button>
            </div>
          </div>
          <div className={styles.bordaLateralAmarela}></div>
        </section>

<div className={styles.separadorHorizontal}></div>

        {/* SEÇÃO 3: MENOS CAOS (Fundo Laranja + Alunos) */}
        <section className={styles.caosSection}>
          <div className={styles.caosTextoDiv}>
            <h2 className={styles.tituloBranco}>
              Menos caos na rotina, <br /> mais LEVEZA ao ensinar
            </h2>
            <p className={styles.paragrafoBranco}>
              Crie, personalize e compartilhe aulas e avaliações completas em minutos, assumindo o controle total do seu tempo e da sua rotina.
            </p>
          </div>
          <div className={styles.caosImagemDiv}>
            <img src={ImagemAlunos} alt="Alunos estudando na biblioteca" className={styles.imagemCapa} />
          </div>
        </section>
      </main>
    </div>
  );
}

export default Inicio;