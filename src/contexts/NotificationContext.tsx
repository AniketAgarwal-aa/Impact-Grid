import React, { createContext, useContext } from 'react';
export const NotificationContext = createContext<unknown>(null);
export const NotificationProvider = ({children}: {children: React.ReactNode}) => <NotificationContext.Provider value={{}}>{children}</NotificationContext.Provider>;
export const useNotificationContext = () => useContext(NotificationContext);