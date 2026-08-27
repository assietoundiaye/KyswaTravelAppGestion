import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [hasSeenLoading, setHasSeenLoading] = useState(false);

  const markLoadingSeen = () => {
    setHasSeenLoading(true);
  };

  const value = {
    hasSeenLoading,
    markLoadingSeen
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;