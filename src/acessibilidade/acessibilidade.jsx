import { useState, useEffect } from 'react';
import './acessibilidade.css'
import { Info } from 'lucide-react';

export default function AccessibilityToolbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState(0);
  const [highContrast, setHighContrast] = useState(false);
  const [dyslexicFont, setDyslexicFont] = useState(false);

  // Aplica as classes e estilos globais no elemento raiz (HTML ou BODY)
  useEffect(() => {
    const root = document.documentElement;

    // Ajuste de contraste
    root.classList.toggle('modo-alto-contraste', highContrast);

    // Ajuste de fonte legível
    root.classList.toggle('fonte-dislexia', dyslexicFont);

    // Ajuste de escala de fonte (base de 100%)
    root.style.fontSize = `${100 + fontSizeLevel * 10}%`;
  }, [fontSizeLevel, highContrast, dyslexicFont]);

  const resetar = () => {
    setFontSizeLevel(0);
    setHighContrast(false);
    setDyslexicFont(false);
  };

  return (
    <aside className="accessibility-wrapper" aria-label="Menu de Acessibilidade">
      {/* Botão flutuante */}
      <button
        className="accessibility-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Abrir opções de acessibilidade"
      >
        <Info />
      </button>

      {/* Painel de opções */}
      {isOpen && (
        <div className="accessibility-panel" role="dialog" aria-label="Opções de Acessibilidade">
          <h3>Acessibilidade</h3>
          
          <div className="button-group">
            <button onClick={() => setFontSizeLevel((prev) => Math.min(prev + 1, 4))}>
              Aumentar Texto (A+)
            </button>
            <button onClick={() => setFontSizeLevel((prev) => Math.max(prev - 1, -1))}>
              Diminuir Texto (A-)
            </button>
          </div>

          <button onClick={() => setHighContrast(!highContrast)}>
            {highContrast ? 'Desativar Contraste' : 'Alto Contraste'}
          </button>

          <button onClick={() => setDyslexicFont(!dyslexicFont)}>
            {dyslexicFont ? 'Fonte Padrão' : 'Fonte para Dislexia'}
          </button>

          <button className="reset-btn" onClick={resetar}>
            Redefinir
          </button>
        </div>
      )}
    </aside>
  );
}