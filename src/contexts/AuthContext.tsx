import React, { createContext, useContext } from 'react';
export const AuthContext = createContext<unknown>(null);
export const AuthProvider = ({children}: {children: React.ReactNode}) => <AuthContext.Provider value={{}}>{children}</AuthContext.Provider>;
export const useAuthContext = () => useContext(AuthContext);