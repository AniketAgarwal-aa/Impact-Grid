import React, { createContext, useContext } from 'react';
export const CurrencyContext = createContext<unknown>(null);
export const CurrencyProvider = ({children}: {children: React.ReactNode}) => <CurrencyContext.Provider value={{}}>{children}</CurrencyContext.Provider>;
export const useCurrencyContext = () => useContext(CurrencyContext);