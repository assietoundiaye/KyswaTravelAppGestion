module.exports = function errorHandler(err, req, res, next) {
  // Duplicate key error (E11000)
  if (err && err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'champ';
    return res.status(400).json({ message: `Valeur déjà utilisée pour le champ '${field}'` });
  }

  // Mongoose validation error
  if (err && err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(' ; ') });
  }

  // CastError (invalid ObjectId)
  if (err && err.name === 'CastError') {
    return res.status(400).json({ message: 'Identifiant invalide' });
  }

  // Fallback
  console.error('Erreur non gérée:', err && err.stack ? err.stack : err);
  return res.status(500).json({ message: 'Erreur serveur' });
};
