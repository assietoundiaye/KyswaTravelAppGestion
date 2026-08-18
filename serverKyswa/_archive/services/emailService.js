/**
 * Service Email
 * Gestion de l'envoi d'emails automatiques
 */

const { getEmailTransporter, isEmailConfigured } = require('../config/email');

/**
 * Templates d'emails
 */
const EMAIL_TEMPLATES = {
  RESERVATION_CONFIRMEE: {
    subject: 'Confirmation de votre réservation - Kyswa Travel',
    template: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563EB; color: white; padding: 20px; text-align: center;">
          <h1>Kyswa Travel</h1>
          <h2>Confirmation de réservation</h2>
        </div>
        
        <div style="padding: 20px;">
          <p>Bonjour <strong>${data.clientNom}</strong>,</p>
          
          <p>Nous avons le plaisir de vous confirmer votre réservation :</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Détails de votre réservation</h3>
            <p><strong>Numéro :</strong> ${data.numeroReservation}</p>
            <p><strong>Package :</strong> ${data.packageNom}</p>
            <p><strong>Date de départ :</strong> ${data.dateDepart}</p>
            <p><strong>Date de retour :</strong> ${data.dateRetour}</p>
            <p><strong>Nombre de places :</strong> ${data.nombrePlaces}</p>
            <p><strong>Montant total :</strong> ${data.montantTotal} FCFA</p>
          </div>
          
          <p>Nous vous contacterons prochainement pour finaliser les détails de votre voyage.</p>
          
          <p>Cordialement,<br>L'équipe Kyswa Travel</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>Kyswa Travel - Agence de voyages religieux</p>
          <p>Email : contact@kyswa.sn | Téléphone : +221 XX XXX XX XX</p>
        </div>
      </div>
    `,
  },

  PAIEMENT_RECU: {
    subject: 'Confirmation de paiement - Kyswa Travel',
    template: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #059669; color: white; padding: 20px; text-align: center;">
          <h1>Kyswa Travel</h1>
          <h2>Paiement reçu</h2>
        </div>
        
        <div style="padding: 20px;">
          <p>Bonjour <strong>${data.clientNom}</strong>,</p>
          
          <p>Nous accusons réception de votre paiement :</p>
          
          <div style="background: #f0fdf4; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #059669;">
            <h3>Détails du paiement</h3>
            <p><strong>Montant :</strong> ${data.montant} FCFA</p>
            <p><strong>Mode :</strong> ${data.modePaiement}</p>
            <p><strong>Date :</strong> ${data.datePaiement}</p>
            <p><strong>Référence :</strong> ${data.reference || 'N/A'}</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
            <p><strong>Solde restant :</strong> ${data.soldeRestant} FCFA</p>
          </div>
          
          <p>Merci pour votre confiance.</p>
          
          <p>Cordialement,<br>L'équipe Kyswa Travel</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>Kyswa Travel - Agence de voyages religieux</p>
          <p>Email : contact@kyswa.sn | Téléphone : +221 XX XXX XX XX</p>
        </div>
      </div>
    `,
  },

  RAPPEL_PAIEMENT: {
    subject: 'Rappel de paiement - Kyswa Travel',
    template: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #DC2626; color: white; padding: 20px; text-align: center;">
          <h1>Kyswa Travel</h1>
          <h2>Rappel de paiement</h2>
        </div>
        
        <div style="padding: 20px;">
          <p>Bonjour <strong>${data.clientNom}</strong>,</p>
          
          <p>Nous vous rappelons qu'un solde reste à régler pour votre réservation :</p>
          
          <div style="background: #fef2f2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #DC2626;">
            <h3>Détails</h3>
            <p><strong>Numéro de réservation :</strong> ${data.numeroReservation}</p>
            <p><strong>Montant restant :</strong> ${data.montantRestant} FCFA</p>
            <p><strong>Date limite :</strong> ${data.dateLimite}</p>
          </div>
          
          <p>Merci de régulariser votre situation dans les plus brefs délais.</p>
          
          <p>Cordialement,<br>L'équipe Kyswa Travel</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>Kyswa Travel - Agence de voyages religieux</p>
          <p>Email : contact@kyswa.sn | Téléphone : +221 XX XXX XX XX</p>
        </div>
      </div>
    `,
  },

  BIENVENUE: {
    subject: 'Bienvenue chez Kyswa Travel',
    template: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563EB; color: white; padding: 20px; text-align: center;">
          <h1>Kyswa Travel</h1>
          <h2>Bienvenue !</h2>
        </div>
        
        <div style="padding: 20px;">
          <p>Bonjour <strong>${data.clientNom}</strong>,</p>
          
          <p>Bienvenue chez Kyswa Travel ! Nous sommes ravis de vous compter parmi nos clients.</p>
          
          <p>Notre équipe est à votre disposition pour organiser vos voyages religieux (Oumra, Hajj, Ziarra) dans les meilleures conditions.</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Vos informations</h3>
            <p><strong>Email :</strong> ${data.email}</p>
            <p><strong>Téléphone :</strong> ${data.telephone || 'Non renseigné'}</p>
          </div>
          
          <p>N'hésitez pas à nous contacter pour toute question.</p>
          
          <p>Cordialement,<br>L'équipe Kyswa Travel</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>Kyswa Travel - Agence de voyages religieux</p>
          <p>Email : contact@kyswa.sn | Téléphone : +221 XX XXX XX XX</p>
        </div>
      </div>
    `,
  },
};

/**
 * Envoyer un email
 * @param {string} to - Destinataire
 * @param {string} subject - Sujet
 * @param {string} html - Contenu HTML
 * @param {string} text - Contenu texte (optionnel)
 * @returns {Promise<Object>} - Résultat de l'envoi
 */
async function sendEmail(to, subject, html, text = null) {
  try {
    // Vérifier la configuration
    if (!isEmailConfigured()) {
      console.log('📧 Email simulé (pas de configuration SMTP):', { to, subject });
      return {
        success: true,
        simulated: true,
        messageId: `simulated-${Date.now()}`,
      };
    }

    const transporter = getEmailTransporter();
    if (!transporter) {
      throw new Error('Transporteur email non disponible');
    }

    const mailOptions = {
      from: `"Kyswa Travel" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Fallback texte sans HTML
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('📧 Email envoyé:', { to, subject, messageId: info.messageId });
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (err) {
    console.error('❌ Erreur envoi email:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Envoyer un email à partir d'un template
 * @param {string} templateName - Nom du template
 * @param {string} to - Destinataire
 * @param {Object} data - Données pour le template
 * @returns {Promise<Object>} - Résultat de l'envoi
 */
async function sendTemplateEmail(templateName, to, data) {
  try {
    const template = EMAIL_TEMPLATES[templateName];
    if (!template) {
      throw new Error(`Template email non trouvé : ${templateName}`);
    }

    const html = template.template(data);
    const subject = template.subject;

    return await sendEmail(to, subject, html);
  } catch (err) {
    console.error('❌ Erreur envoi template email:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Envoyer email de confirmation de réservation
 * @param {Object} reservation - Données de la réservation
 * @param {Object} client - Données du client
 * @returns {Promise<Object>} - Résultat de l'envoi
 */
async function envoyerConfirmationReservation(reservation, client) {
  const data = {
    clientNom: `${client.prenom} ${client.nom}`,
    numeroReservation: reservation.idReservation,
    packageNom: reservation.packageKId?.nomReference || 'Package',
    dateDepart: reservation.dateDepart ? new Date(reservation.dateDepart).toLocaleDateString('fr-FR') : 'À définir',
    dateRetour: reservation.dateRetour ? new Date(reservation.dateRetour).toLocaleDateString('fr-FR') : 'À définir',
    nombrePlaces: reservation.nombrePlaces,
    montantTotal: reservation.montantTotalDu?.toLocaleString('fr-FR') || '0',
  };

  return await sendTemplateEmail('RESERVATION_CONFIRMEE', client.email, data);
}

/**
 * Envoyer email de confirmation de paiement
 * @param {Object} paiement - Données du paiement
 * @param {Object} client - Données du client
 * @param {number} soldeRestant - Solde restant
 * @returns {Promise<Object>} - Résultat de l'envoi
 */
async function envoyerConfirmationPaiement(paiement, client, soldeRestant) {
  const data = {
    clientNom: `${client.prenom} ${client.nom}`,
    montant: parseFloat(paiement.montant.toString()).toLocaleString('fr-FR'),
    modePaiement: paiement.mode,
    datePaiement: new Date(paiement.dateReglement).toLocaleDateString('fr-FR'),
    reference: paiement.reference,
    soldeRestant: soldeRestant.toLocaleString('fr-FR'),
  };

  return await sendTemplateEmail('PAIEMENT_RECU', client.email, data);
}

/**
 * Envoyer email de rappel de paiement
 * @param {Object} reservation - Données de la réservation
 * @param {Object} client - Données du client
 * @param {number} montantRestant - Montant restant à payer
 * @returns {Promise<Object>} - Résultat de l'envoi
 */
async function envoyerRappelPaiement(reservation, client, montantRestant) {
  const dateLimite = new Date();
  dateLimite.setDate(dateLimite.getDate() + 7); // 7 jours

  const data = {
    clientNom: `${client.prenom} ${client.nom}`,
    numeroReservation: reservation.idReservation,
    montantRestant: montantRestant.toLocaleString('fr-FR'),
    dateLimite: dateLimite.toLocaleDateString('fr-FR'),
  };

  return await sendTemplateEmail('RAPPEL_PAIEMENT', client.email, data);
}

/**
 * Envoyer email de bienvenue
 * @param {Object} client - Données du client
 * @returns {Promise<Object>} - Résultat de l'envoi
 */
async function envoyerBienvenue(client) {
  const data = {
    clientNom: `${client.prenom} ${client.nom}`,
    email: client.email,
    telephone: client.telephone,
  };

  return await sendTemplateEmail('BIENVENUE', client.email, data);
}

/**
 * Obtenir la liste des templates disponibles
 * @returns {Array<string>} - Noms des templates
 */
function getAvailableTemplates() {
  return Object.keys(EMAIL_TEMPLATES);
}

/**
 * Tester l'envoi d'email
 * @param {string} to - Destinataire de test
 * @returns {Promise<Object>} - Résultat du test
 */
async function testEmail(to) {
  const testData = {
    clientNom: 'Test Client',
    email: to,
    telephone: '+221 XX XXX XX XX',
  };

  return await sendTemplateEmail('BIENVENUE', to, testData);
}

module.exports = {
  // Fonctions principales
  sendEmail,
  sendTemplateEmail,
  
  // Emails spécialisés
  envoyerConfirmationReservation,
  envoyerConfirmationPaiement,
  envoyerRappelPaiement,
  envoyerBienvenue,
  
  // Utilitaires
  getAvailableTemplates,
  testEmail,
  
  // Configuration
  isEmailConfigured: isEmailConfigured,
};