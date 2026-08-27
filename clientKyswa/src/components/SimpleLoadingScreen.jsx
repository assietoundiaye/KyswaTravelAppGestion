import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import logo from '../assets/logokyswa.jpg';
import './LoadingScreen.css';

/**
 * Version simple du LoadingScreen qui s'affiche toujours
 * à chaque visite de la route racine "/"
 */
const SimpleLoadingScreen = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2000);

    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(loadingTimer);
    };
  }, []);

  if (!isLoading) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={`loading-screen ${fadeOut ? 'fade-out' : ''}`}>
      <div className="loading-content">
        <div className="logo-container">
          <img 
            src={logo} 
            alt="Kyswa Travel" 
            className="logo-loading"
          />
        </div>
        
        <div className="company-info">
          <h1 className="company-name">Kyswa Travel</h1>
          <p className="company-subtitle">Espace de gestion interne sécurisé</p>
        </div>

        <div className="loading-spinner">
          <div className="spinner-ring">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
        </div>

        <div className="loading-text">
          Chargement...
        </div>
      </div>

      <div className="loading-footer">
        <p>&copy; 2026 Kyswa Travel</p>
      </div>
    </div>
  );
};

export default SimpleLoadingScreen;