import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import LoadingScreen from './LoadingScreen';

const AppInitializer = () => {
  const { hasSeenLoading } = useApp();

  // Si l'utilisateur a déjà vu le loading, aller directement au login
  if (hasSeenLoading) {
    return <Navigate to="/login" replace />;
  }

  // Sinon, afficher la page de chargement
  return <LoadingScreen />;
};

export default AppInitializer;