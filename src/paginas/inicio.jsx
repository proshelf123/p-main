import styles from './inicio.module.css'; // <-- Importação alterada
import { motion } from "framer-motion";
import { Link, useNavigate } from 'react-router-dom'; // Ajustado import do useNavigate
import Logo from '../assets/Group 32 (2).png';
import LogoMobile from '../assets/Group 44.png';
import Porta from '../assets/Union.png';
import Mariana from '../assets/mariana.webp';
import Background from '../assets/background.webp';

const text = "Quero cadastrar a minha escola";
const text1 = "Já estamos cadastrados";

const container = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04, 
    },
  },
};

const letter = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

function Inicio() {
  const navigate = useNavigate();

  return (
    <>
      <header className={styles.cabecalho}>
        <div>
          <Link to="/">
            <img 
              src={Logo} 
              className={styles.logo} // <-- Era id='logo'
              alt="Descrição da imagem para acessibilidade" 
              style={{ cursor: 'pointer' }} 
            />
          </Link>

          <img src={LogoMobile} className={styles['logo-mobile']} alt="Logo Mobile"/> 
        </div>

        <nav>
          <ul className={styles.ul}>
            {/* Botão Cadastrar Escola */}
            <motion.li 
              className={styles.menu} // <-- Era id='menu'
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ cursor: "pointer" }}
            >
              <Link to="/cadastrar-escola" style={{textDecoration:"none"}}>
                <motion.span
                  variants={container}
                  initial="hidden"
                  animate="visible"
                  style={{
                    textDecoration: "none",
                    color: "black",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    userSelect:"none",
                  }}>
                  {text.split("").map((char, index) => (
                    <motion.span key={index} variants={letter}>
                        {char === " " ? "\u00A0" : char}
                    </motion.span>
                  ))}
                </motion.span>
              </Link>

              <motion.div
                  initial={{ opacity: 0, x: -10, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ duration: 1.0, ease: "easeOut" }}>
                  <Link to="/cadastrar-escola">
                    <img src={Porta} className={styles['porta-icone']} alt="Ícone porta" />
                  </Link>
              </motion.div>
              <Link to="/cadastrar-escola" style={{ textDecoration: "none", color: "black" }}>
                <img src={Porta} className={styles['porta-icone-mobile']} alt="Ícone porta mobile" />
              </Link>
            </motion.li>

            {/* Botão Já estamos cadastrados */}
            <motion.li 
              className={styles.menu1} // <-- Era id='menu1'
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ cursor: "pointer" }}
            >
              <Link to="/login" style={{textDecoration:"none"}}>
                <motion.span
                  variants={container}
                  initial="hidden"
                  animate="visible"
                  style={{
                    textDecoration: "none",
                    color: "black",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    userSelect:"none",
                  }}>
                  {text1.split("").map((char, index) => (
                    <motion.span key={index} variants={letter}>
                        {char === " " ? "\u00A0" : char}
                    </motion.span>
                  ))}
                </motion.span>
              </Link>

              <motion.div
                  initial={{ opacity: 0, x: -10, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ duration: 1.0, ease: "easeOut" }}>
                  <Link to="/login">
                    <img src={Porta} className={styles['porta-icone']} alt="Ícone porta" />
                  </Link>
              </motion.div>
              <Link to="/login" style={{ textDecoration: "none", color: "black" }}>
                <img src={Porta} className={styles['porta-icone-mobile']} alt="Ícone porta mobile" />
              </Link>
            </motion.li>
          </ul>
        </nav>
      </header>

      <div className={styles.pagina}> 
        <div style={{
            backgroundImage: `url(${Background})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            height:"100vh",
        }}>
        </div>

        <div className={styles['container-circulos']}>
          <div className={styles['circulo-laranja']}></div>
          <div className={styles['circulo-amarelo']}></div>
          <div><img src={Mariana} className={styles.mariana} alt="Mariana"/></div>
        </div>

        <section className={styles.textos}> 
          <div className={styles['texto-direita']}>
            <h1 className={styles['tamanho-fonte']}>
              A estante{" "}
              <span className={styles.inteligente}>
                <span className={styles['com-barra']}>inteli
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
                    className={styles['barra-animada']}/>
                </span>
                <span className={styles['sem-barra']}>g</span>
                <span className={styles['com-barra']}>ente
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.8 }}
                    className={styles['barra-animada']}/>
                </span>
              </span>{" "}
              <span className={styles['do-professor']}> do professor </span>
            </h1>
          </div>

          <div className={styles.entrar}> 
              <motion.button
                onClick={() => navigate("/login")}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 1.3 }} 
                className={styles['botao-entrar']}> 
                <Link to="/login" style={{textDecoration:"none", color:"white", userSelect:"none", fontSize:"50px"}}>Entrar</Link> 
              </motion.button>
          </div> 
        </section>
      </div>
    </>
  )
} 

export default Inicio;