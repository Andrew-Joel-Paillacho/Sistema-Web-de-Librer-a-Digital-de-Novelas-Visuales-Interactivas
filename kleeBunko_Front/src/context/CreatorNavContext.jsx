import { createContext, useContext, useState, useRef, useCallback } from 'react';

const CreatorNavContext = createContext(null);

export const CreatorNavProvider = ({ children }) => {
  // ¿Hay editor abierto con cambios sin guardar?
  const [isDirty, setIsDirty] = useState(false);

  // Referencias a funciones que el editor registra
  const saveAndExitRef = useRef(null); // async () => void
  const discardRef = useRef(null);     // () => void
  const openCreateModalRef = useRef(null); // () => void (lo registra MyStories)

  const registerEditor = useCallback(({ saveAndExit, discard }) => {
    saveAndExitRef.current = saveAndExit;
    discardRef.current = discard;
  }, []);

  const unregisterEditor = useCallback(() => {
    saveAndExitRef.current = null;
    discardRef.current = null;
    setIsDirty(false);
  }, []);

  const registerOpenCreateModal = useCallback((fn) => {
    openCreateModalRef.current = fn;
  }, []);

  const saveAndExit = useCallback(async () => {
    if (saveAndExitRef.current) await saveAndExitRef.current();
  }, []);

  const discard = useCallback(() => {
    if (discardRef.current) discardRef.current();
  }, []);

  const openCreateModal = useCallback(() => {
    if (openCreateModalRef.current) openCreateModalRef.current();
  }, []);

  const value = {
    isDirty,
    setIsDirty,
    registerEditor,
    unregisterEditor,
    saveAndExit,
    discard,
    registerOpenCreateModal,
    openCreateModal,
  };

  return (
    <CreatorNavContext.Provider value={value}>
      {children}
    </CreatorNavContext.Provider>
  );
};

export const useCreatorNav = () => {
  const ctx = useContext(CreatorNavContext);
  if (!ctx) throw new Error('useCreatorNav debe usarse dentro de CreatorNavProvider');
  return ctx;
};