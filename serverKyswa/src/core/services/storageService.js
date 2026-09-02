/**
 * @fileoverview Service de stockage local autonome (SSD / Disque Serveur Infomaniak)
 * 
 * Permet d'enregistrer et de servir tous les fichiers (photos passeports, CNI, documents administratifs)
 * directement sur le disque local sans dépendre d'un tiers externe (Cloudinary / AWS),
 * garantissant la souveraineté, la confidentialité et 0€ de frais supplémentaires.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Racine du stockage local sur le serveur
const UPLOADS_ROOT = path.resolve(__dirname, '../../../uploads');

// Créer les sous-dossiers nécessaires au démarrage
const SUBDIRECTORIES = [
  'clients/photos',
  'clients/documents',
  'documents',
  'receipts',
  'temp',
];

function ensureDirectories() {
  if (!fs.existsSync(UPLOADS_ROOT)) {
    fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
  }
  for (const sub of SUBDIRECTORIES) {
    const fullPath = path.join(UPLOADS_ROOT, sub);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }
}

// Initialiser les dossiers au chargement
ensureDirectories();

/**
 * Nettoyer un nom de fichier pour la sécurité
 */
function sanitizeFilename(name) {
  return (name || 'file')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .toLowerCase();
}

/**
 * Sauvegarder un buffer sur le disque local
 * @param {Buffer} buffer - Contenu binaire du fichier
 * @param {string} subfolder - Sous-dossier (ex: 'clients/photos', 'documents')
 * @param {string} filename - Nom de fichier désiré (ex: 'passport_cisse_123.jpg')
 * @returns {Promise<{ url: string, filePath: string, filename: string }>}
 */
async function saveBuffer(buffer, subfolder = 'documents', filename) {
  ensureDirectories();
  const targetDir = path.join(UPLOADS_ROOT, subfolder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const finalName = filename || `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
  const filePath = path.join(targetDir, finalName);

  await fs.promises.writeFile(filePath, buffer);

  // URL publique servie par Express
  const publicUrl = `/uploads/${subfolder}/${finalName}`;

  return {
    url: publicUrl,
    filePath,
    filename: finalName,
  };
}

/**
 * Sauvegarder les photos de passeport extraites par OCR (Document complet + Photo de profil recadrée)
 * @param {Buffer} zonePhotoBuffer - Photo du visage recadrée
 * @param {Buffer} fullDocumentBuffer - Scan complet de la page du passeport
 * @param {Object} clientInfo - { nom, prenom, numeroPasseport }
 */
async function savePassportPhotos(zonePhotoBuffer, fullDocumentBuffer, clientInfo = {}) {
  try {
    ensureDirectories();
    const timestamp = Date.now();
    const cleanName = sanitizeFilename(clientInfo.nom || 'client');
    const baseFilename = `passport_${cleanName}_${timestamp}`;

    const result = {};

    // 1. Sauvegarder le scan complet du passeport
    if (fullDocumentBuffer && Buffer.isBuffer(fullDocumentBuffer) && fullDocumentBuffer.length > 0) {
      // Optimiser / compresser légèrement avec Sharp pour économiser l'espace
      let optimizedBuffer = fullDocumentBuffer;
      try {
        optimizedBuffer = await sharp(fullDocumentBuffer)
          .jpeg({ quality: 85 })
          .toBuffer();
      } catch (err) {
        console.warn('[StorageService] Compression scan échouée, conservation buffer original:', err.message);
      }

      const fullSave = await saveBuffer(optimizedBuffer, 'clients/documents', `${baseFilename}_full.jpg`);
      result.documentPhotoUrl = fullSave.url;
      result.documentPhotoPublicId = `local:${fullSave.filename}`;
    }

    // 2. Sauvegarder la photo de profil (zone visage recadrée par l'OCR)
    if (zonePhotoBuffer && Buffer.isBuffer(zonePhotoBuffer) && zonePhotoBuffer.length > 0) {
      let profileBuffer = zonePhotoBuffer;
      try {
        // On utilise 'contain' pour ne pas déformer le visage, avec fond blanc
        profileBuffer = await sharp(zonePhotoBuffer)
          .resize(400, 500, {
            fit: 'contain',        // Préserve les proportions sans recadrage brutal
            position: 'centre',
            background: { r: 255, g: 255, b: 255, alpha: 1 },
          })
          .jpeg({ quality: 92 })
          .toBuffer();
      } catch (err) {
        console.warn('[StorageService] Redimensionnement profil échoué, conservation buffer original:', err.message);
      }

      const profileSave = await saveBuffer(profileBuffer, 'clients/photos', `${baseFilename}_profile.jpg`);
      result.photoUrl = profileSave.url;
      result.photoPublicId = `local:${profileSave.filename}`;
    }

    if (result.photoUrl || result.documentPhotoUrl) {
      result.extractedFrom = 'passport';
      result.extractedAt = new Date().toISOString();
      return result;
    }

    return null;
  } catch (error) {
    console.error('[StorageService] Erreur sauvegarde photos passeport:', error);
    return null;
  }
}

/**
 * Sauvegarder un document uploadé (PDF, Image, etc.)
 * @param {Buffer} buffer - Buffer du fichier
 * @param {string} originalName - Nom d'origine du fichier
 * @param {string} subfolder - Sous-dossier (défaut 'documents')
 */
async function saveDocument(buffer, originalName, subfolder = 'documents') {
  const ext = path.extname(originalName || '') || '.pdf';
  const cleanBase = sanitizeFilename(path.basename(originalName || 'doc', ext));
  const uniqueName = `${cleanBase}_${Date.now()}${ext}`;

  return await saveBuffer(buffer, subfolder, uniqueName);
}

/**
 * Supprimer un fichier localement si besoin
 * @param {string} fileUrl - URL comme '/uploads/documents/doc_123.pdf'
 */
async function deleteLocalFile(fileUrl) {
  try {
    if (!fileUrl || !fileUrl.startsWith('/uploads/')) return false;
    const relativePath = fileUrl.replace('/uploads/', '');
    const fullPath = path.join(UPLOADS_ROOT, relativePath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      return true;
    }
  } catch (err) {
    console.error('[StorageService] Erreur suppression fichier:', err.message);
  }
  return false;
}

module.exports = {
  UPLOADS_ROOT,
  ensureDirectories,
  saveBuffer,
  savePassportPhotos,
  saveDocument,
  deleteLocalFile,
};
