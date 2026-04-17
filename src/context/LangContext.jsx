import React, { createContext, useContext, useState } from 'react';

const LangCtx = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(
    () => localStorage.getItem('em_lang') || 'de'
  );

  function setLang(next) {
    setLangState(next);
    localStorage.setItem('em_lang', next);
  }

  return (
    <LangCtx.Provider value={{ lang, setLang }}>
      {children}
    </LangCtx.Provider>
  );
}

export function useLang() {
  return useContext(LangCtx);
}
