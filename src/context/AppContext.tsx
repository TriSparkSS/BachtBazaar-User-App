import React, { PropsWithChildren, createContext, useMemo } from 'react';

type AppContextValue = Record<string, unknown>;

export const AppContext = createContext<AppContextValue>({});

export const AppProvider = ({ children }: PropsWithChildren) => {
  const value = useMemo<AppContextValue>(() => ({}), []);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};


