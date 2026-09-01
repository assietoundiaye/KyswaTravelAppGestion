/**
 * @fileoverview Helper pour formater et résoudre les URLs des images et documents
 * Compatible à la fois avec le stockage local (/uploads/...) et Cloudinary (https://res.cloudinary.com/...)
 */

export function getMediaUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  // URL relative servie par le backend
  const apiBase = import.meta.env.VITE_API_URL;
  if (apiBase && !apiBase.startsWith('/')) {
    // Si l'API est hébergée sur un sous-domaine séparé en prod (ex: https://api.kyswa.sn)
    const backendOrigin = new URL(apiBase).origin;
    return `${backendOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  return url;
}

export default getMediaUrl;
