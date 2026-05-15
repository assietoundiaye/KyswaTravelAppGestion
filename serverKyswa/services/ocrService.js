/**
 * ocrService.js — Lecture passeport/CNI via Tesseract.js + parseur MRZ
 * Workers pré-initialisés au démarrage pour éviter le rechargement à chaque scan
 */

const { createWorker, PSM } = require('tesseract.js');
const mrz = require('mrz');
const sharp = require('sharp');

// ── Workers persistants (initialisés une fois, réutilisés) ───────────────────
let workerMrz  = null; // eng + whitelist MRZ
let workerFull = null; // eng, mode auto
let workerCni  = null; // fra+eng, mode auto
let initPromise = null;

async function initWorkers() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    console.log('🔍 Initialisation des workers OCR...');
    [workerMrz, workerFull, workerCni] = await Promise.all([
      createWorker('eng', 1, { logger: () => {} }),
      createWorker('eng', 1, { logger: () => {} }),
      createWorker('fra+eng', 1, { logger: () => {} }),
    ]);
    await Promise.all([
      workerMrz.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      }),
      workerFull.setParameters({ tessedit_pageseg_mode: PSM.AUTO }),
      workerCni.setParameters({ tessedit_pageseg_mode: PSM.AUTO }),
    ]);
    console.log('✅ Workers OCR prêts');
  })();
  return initPromise;
}

// Démarrer l'initialisation en arrière-plan dès le chargement du module
initWorkers().catch(err => console.warn('⚠️  OCR workers init failed:', err.message));

// ── Prétraitement image complète ──────────────────────────────────────────────
async function preprocessFull(buffer) {
  return sharp(buffer)
    .resize({ width: 1800, withoutEnlargement: false })
    .grayscale()
    .normalize()
    .sharpen({ sigma: 1 })
    .toBuffer();
}

// ── Recadrer le bas de l'image (zone MRZ = ~28% inférieurs) ──────────────────
async function cropMrzZone(buffer) {
  const meta = await sharp(buffer).metadata();
  const cropTop = Math.floor(meta.height * 0.72);
  return sharp(buffer)
    .extract({ left: 0, top: cropTop, width: meta.width, height: meta.height - cropTop })
    .resize({ width: 1800, withoutEnlargement: false })
    .grayscale()
    .normalize()
    .linear(1.4, -30)
    .sharpen({ sigma: 2 })
    .toBuffer();
}

// ── Formater date MRZ YYMMDD → YYYY-MM-DD ────────────────────────────────────
function parseMrzDate(yymmdd) {
  if (!yymmdd || yymmdd.length !== 6) return '';
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  // Pivot dynamique: évite les dates d'expiration dans le passé (ex: 31 -> 2031 en 2026)
  const nowYY = new Date().getFullYear() % 100;
  const pivot = nowYY + 5; // tolérance 5 ans
  const yyyy = yy > pivot ? `19${String(yy).padStart(2, '0')}` : `20${String(yy).padStart(2, '0')}`;
  return `${yyyy}-${mm}-${dd}`;
}

// ── Normaliser une ligne MRZ brute ────────────────────────────────────────────
function normalizeMrzLine(raw) {
  return raw
    .toUpperCase()
    .replace(/\s+/g, '')                          // supprimer espaces
    .replace(/L{3,}/g, s => '<'.repeat(s.length)) // LLL+ → <<< (confusion OCR)
    .replace(/[^A-Z0-9<]/g, '<');                 // tout le reste → <
}

// ── Corriger préfixe TD3: "<" souvent lu "C" après P (PCSEN → P<SEN) ─────────
const KNOWN_ISSUING_STATES = new Set([
  'SEN', 'FRA', 'MLI', 'MAR', 'BEL', 'USA', 'CAN', 'GBR', 'DEU', 'ESP', 'ITA', 'CIV', 'GIN', 'GMB',
]);

function fixTd3Line1Prefix(l) {
  if (!l || l.length < 6) return l;
  // P + C + 3 lettres pays connues → P< + pays
  const pc = l.match(/^PC([A-Z]{3})(.*)$/);
  if (pc && KNOWN_ISSUING_STATES.has(pc[1])) {
    return `P<${pc[1]}${pc[2]}`;
  }
  return l;
}

// ── Préfixe TD1 (CNI) : I< souvent lu IC… ou 1<… ─────────────────────────────
function fixTd1Line0Prefix(l) {
  if (!l || l.length < 5) return l;
  if (/^1</.test(l)) return `I${l.slice(1)}`;
  const ic = l.match(/^IC([A-Z]{3})(.*)$/);
  if (ic && KNOWN_ISSUING_STATES.has(ic[1])) return `I<${ic[1]}${ic[2]}`;
  const ac = l.match(/^([AC])C([A-Z]{3})(.*)$/);
  if (ac && KNOWN_ISSUING_STATES.has(ac[2])) return `${ac[1]}<${ac[2]}${ac[3]}`;
  return l;
}

function applyDocNumberOcrFixes(zone9) {
  let z = zone9
    .replace(/D/g, '0')
    .replace(/G/g, '6')
    .replace(/B/g, '8')
    .replace(/I/g, '1')
    .replace(/O/g, '0')
    .replace(/Q/g, '0')
    .replace(/S/g, '5')
    .replace(/Z/g, '2');
  if (/^[A-Z]{2}/.test(z) && z[0] === z[1]) z = z[0] + z.slice(2);
  return z;
}

/** Ligne 0 TD1 (30) : doc + numéro (positions 5–14) */
function fixTd1Line0(l30) {
  let l = fixTd1Line0Prefix(String(l30).toUpperCase()).slice(0, 30).padEnd(30, '<');
  const head = l.slice(0, 5);
  const doc = applyDocNumberOcrFixes(l.slice(5, 14));
  return (head + doc + l.slice(14)).slice(0, 30).padEnd(30, '<');
}

/** Ligne 2 TD1 (30) : noms (même famille d’artefacts que TD3, sans préfixe P<) */
function cleanTd1Line2(l) {
  let x = String(l).toUpperCase().slice(0, 30).padEnd(30, '<');
  x = x
    .replace(/^([A-Z]{2,})<([A-Z]{2,})(<)/, '$1<<$2$3')
    .replace(/([A-Z]{3,})C(<{3,})/g, '$1$2')
    .replace(/<<K/g, '<<')
    .replace(/(<K)+</g, '<<')
    .replace(/K+</g, '<');
  return x.slice(0, 30).padEnd(30, '<');
}

function toMrz30(l) {
  if (!l) return '<'.repeat(30);
  return String(l).toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9<]/g, '<').slice(0, 30).padEnd(30, '<');
}

function scoreTd1Triplet(a, b, c) {
  const ratio = (s) => (s.match(/[A-Z0-9<]/g) || []).length / Math.max(s.length, 1);
  if (ratio(a) < 0.72 || ratio(b) < 0.72 || ratio(c) < 0.72) return -1;
  let s = 0;
  const a0 = fixTd1Line0Prefix(a);
  if (/^I</.test(a0)) s += 140;
  else if (/^[IAC]</.test(a0)) s += 70;
  const iss = a0.slice(2, 5);
  if (KNOWN_ISSUING_STATES.has(iss)) s += 50;
  if (/^\d{6}/.test(b) || /^[0-9OIlDB]{6}/.test(b)) s += 45;
  if (b.includes('SEN') || a.includes('SEN')) s += 25;
  const sep = (c.match(/<</g) || []).length;
  s += sep * 22 - (c.match(/L/g) || []).length * 8;
  return s;
}

/** Extrait les champs MRZ TD1 (CNI ICAO : 3×30 car.) depuis le texte OCR */
function extractTd1MrzFields(text) {
  const rawLines = text.split('\n').map((l) => l.trim()).filter((l) => l.length >= 12);
  const cleaned = rawLines.map(normalizeMrzLine);
  const windows = [];
  for (let i = 0; i <= cleaned.length - 3; i++) {
    const a = cleaned[i];
    const b = cleaned[i + 1];
    const c = cleaned[i + 2];
    if (a.length < 18 || b.length < 18 || c.length < 18) continue;
    const sc = scoreTd1Triplet(a, b, c);
    if (sc < 0) continue;
    windows.push({ sc, a, b, c });
  }
  windows.sort((u, v) => v.sc - u.sc);
  for (const { a, b, c } of windows) {
    const f = tryParseTd1Mrz([toMrz30(a), toMrz30(b), toMrz30(c)]);
    if (f) return f;
  }
  return null;
}

function isPlausibleCniMrz(f) {
  if (!f || !f.documentNumber) return false;
  const doc = String(f.documentNumber).replace(/</g, '').trim();
  if (doc.length < 6 || doc.length > 14) return false;
  const ln = String(f.lastName || '').replace(/</g, '').toUpperCase();
  const fn = String(f.firstName || '').replace(/</g, '').trim();
  if (/GIVENNAMES?|SURNAMES?|NATIONALITY/i.test(ln)) return false;
  if (fn.length <= 1 && ln.length > 22) return false;
  if (!f.birthDate || String(f.birthDate).length !== 6) return false;
  if (f.expirationDate != null && f.expirationDate !== '' && String(f.expirationDate).length !== 6) return false;
  return true;
}

/** Parse TD1 avec variantes OCR (mrz.autocorrect aide les dates) */
function tryParseTd1Mrz(tri30) {
  if (!tri30 || tri30.length !== 3) return null;
  const [r0, r1, r2] = tri30;
  const v0 = [...new Set([r0, fixTd1Line0(r0), fixTd1Line0(fixTd1Line0Prefix(r0))])];
  const v1 = [...new Set([r1, r1.replace(/O(?=\d)/g, '0')])];
  const v2 = [...new Set([r2, cleanTd1Line2(r2), cleanTd1Line2(cleanTd1Line2(r2))])];

  let best = null;
  for (const l0 of v0) {
    for (const l1 of v1) {
      for (const l2 of v2) {
        const t = [toMrz30(l0), toMrz30(l1), toMrz30(l2)];
        try {
          const result = mrz.parse(t, { autocorrect: true });
          const f = result.fields;
          if (!f.documentNumber) continue;
          if (isPlausibleCniMrz(f)) return f;
          if (!best && (f.lastName || f.documentNumber)) best = f;
        } catch (_) {}
      }
    }
  }
  return best;
}

// ── Nettoyer la ligne 1 (zone nom/prénom) ─────────────────────────────────────
// Supprime les artefacts OCR courants : K< isolés, séquences KLKL...
function cleanLine1(l) {
  return fixTd3Line1Prefix(l)
    // Un seul « < » entre nom et prénom (ex: BOYE<CHABIB) → BOYE<<CHABIB (TD3 ICAO)
    .replace(/^(P<[A-Z]{3})([A-Z]{2,})<([A-Z]{2,})(<)/, '$1$2<<$3$4')
    .replace(/<<K/g, '<<')     // <<K -> << (K parasite sur prenom)
    .replace(/(<K)+</g, '<<')   // <K< → << (K isolé entre séparateurs)
    .replace(/K+</g, '<')       // K< en fin → <
    // « C » parasite entre prénom et fillers (ex: CHABIBC<<<<<<<<)
    .replace(/([A-Z]{3,})C(<{3,})/g, '$1$2')
    .slice(0, 44)
    .padEnd(44, '<');
}

// ── Corriger la ligne 2 (zone numérique) ──────────────────────────────────────
function fixLine2DocNumber(l2) {
  // Corriger d’abord les 9 premiers caractères (numéro document) — même logique que TD1.
  const docZone = applyDocNumberOcrFixes(l2.slice(0, 9));
  const rest = l2.slice(9);

  // Supprimer les chars parasites entre le check digit (pos 9) et le code pays (SEN/FRA/etc.)
  // Pattern : [9 chars numéro][1 check][chars parasites][3 chars pays]
  const fixed = docZone + rest;
  return fixed.replace(/^(.{9})(.)(.+?)([A-Z]{3}\d{6})/, (m, num, check, junk, rest2) => {
    // Supprimer le junk seulement s'il est court (1-2 chars parasites)
    if (junk.length <= 2) return num + check + rest2;
    return m; // garder tel quel si trop long
  });
}

// ── Trouver les lignes MRZ dans un texte OCR ─────────────────────────────────
function findMrzLines(text) {
  const rawLines = text.split('\n').map(l => l.trim()).filter(l => l.length >= 15);
  const cleaned = rawLines.map(normalizeMrzLine);

  // Filtrer les lignes qui ressemblent à de la MRZ (>80% de chars valides)
  const candidates = cleaned.filter(l => {
    if (l.length < 20) return false;
    const valid = (l.match(/[A-Z0-9<]/g) || []).length;
    return valid / l.length > 0.80;
  });

  if (candidates.length === 0) return null;

  // Ligne 1 TD3: idéalement P< + code pays (3 lettres). Ne pas confondre avec PCSEN…
  const fixedCandidates = candidates.map((l) => fixTd3Line1Prefix(l));
  const line1Preferred = fixedCandidates.find((l) => /^P</.test(l));
  const line1Fallback = fixedCandidates.find((l) => /^P[A-Z<]/.test(l));
  const line1 = line1Preferred || line1Fallback;

  // Chercher la ligne 2 (ne commence pas par P<, longueur >= 30)
  // Préférer les lignes qui contiennent le code pays en position 10-12
  const line2candidates = candidates
    .filter(l => {
      if (l === line1) return false;
      if (/^P[A-Z<]/.test(l)) return false;
      return l.length >= 30;
    })
    .sort((a, b) => {
      // Priorité 1 : contient SEN (ou autre code pays 3 lettres) en position 10-12
      const aHasSen = /^.{9,12}[A-Z]{3}\d/.test(a);
      const bHasSen = /^.{9,12}[A-Z]{3}\d/.test(b);
      if (aHasSen && !bHasSen) return -1;
      if (!aHasSen && bHasSen) return 1;
      // Priorité 2 : longueur proche de 44
      return Math.abs(a.length - 44) - Math.abs(b.length - 44);
    });

  if (line1 && line2candidates.length > 0) {
    // Ligne 1 : nettoyer les artefacts K< et prendre 44 chars
    const l1 = cleanLine1(line1);

    // Ligne 2 : générer plusieurs variantes
    const l2variants = [];
    for (const l2raw of line2candidates) {
      const l2fixed = fixLine2DocNumber(l2raw);

      if (l2fixed.length <= 44) {
        l2variants.push(l2fixed.padEnd(44, '<'));
      } else {
        // Essayer premiers 44, derniers 44, et aligné sur SEN
        l2variants.push(l2fixed.slice(0, 44));
        l2variants.push(l2fixed.slice(-44));
        // Chercher SEN (code pays) en position 10-12 pour aligner
        const senIdx = l2fixed.indexOf('SEN');
        if (senIdx >= 9 && senIdx <= 13) {
          const start = senIdx - 9;
          const aligned = l2fixed.slice(start, start + 44).padEnd(44, '<');
          if (aligned.length === 44) l2variants.push(aligned);
        }
      }
    }

    return [l1, ...l2variants];
  }

  // Fallback : 2 lignes les plus longues
  const sorted = [...candidates].sort((a, b) => b.length - a.length);
  if (sorted.length >= 2) {
    return [
      cleanLine1(sorted[0]),
      fixLine2DocNumber(sorted[1]).slice(0, 44).padEnd(44, '<'),
    ];
  }

  return null;
}

// ── Rejeter les parses MRZ manifestement faux (ligne 1 OCR incorrecte, etc.) ─
function isPlausiblePassportMrz(f) {
  if (!f || !f.documentNumber) return false;
  const doc = String(f.documentNumber).replace(/</g, '').trim();
  if (doc.length < 6 || doc.length > 12) return false;
  const ln = String(f.lastName || '').replace(/</g, '').toUpperCase();
  const fn = String(f.firstName || '').replace(/</g, '').trim();
  if (/GIVENNAMES?|SURNAMES?|NATIONALITY/i.test(ln)) return false;
  if (fn.length <= 1 && ln.length > 18) return false;
  if (!f.birthDate || String(f.birthDate).length !== 6) return false;
  if (!f.expirationDate || String(f.expirationDate).length !== 6) return false;
  return true;
}

// ── Tenter de parser la MRZ avec plusieurs variantes ─────────────────────────
// `requirePassportPlausibility` / `requireCniPlausibility` : n’accepte que des champs cohérents
function tryParseMrz(lines, { requirePassportPlausibility = false, requireCniPlausibility = false } = {}) {
  if (!lines || lines.length < 2) return null;

  const line1 = lines[0];
  const line2variants = lines.slice(1);

  // Variantes de la ligne 1
  const line1variants = [
    line1,
    fixTd3Line1Prefix(line1),
    cleanLine1(line1),                                          // nettoyer K< artefacts
    line1.replace(/L{2,}/g, s => '<'.repeat(s.length)),        // LLL → <<<
    cleanLine1(line1.replace(/L{2,}/g, s => '<'.repeat(s.length))), // les deux
  ];

  let best = null;
  for (const l1 of line1variants) {
    for (const l2 of line2variants) {
      for (const l2v of [l2, l2.replace(/O(?=\d)/g, '0')]) {
        try {
          const result = mrz.parse([l1, l2v]);
          const f = result.fields;
          if (!f.lastName && !f.documentNumber) continue;
          if (isPlausiblePassportMrz(f)) return f;
          if (requirePassportPlausibility) {
            if (!best && (f.lastName || f.documentNumber)) best = f;
            continue;
          }
          if (requireCniPlausibility) {
            if (isPlausibleCniMrz(f)) return f;
            if (!best && (f.lastName || f.documentNumber)) best = f;
            continue;
          }
          if (f.lastName || f.documentNumber) return f;
        } catch (_) {}
      }
    }
  }

  if (requirePassportPlausibility || requireCniPlausibility) return null;
  return best;
}

// ── Nettoyer le prénom (enlever artefacts OCR de fin de ligne 1) ──────────────
function cleanFirstName(raw) {
  let s = (raw || '')
    .replace(/</g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/(\s+[A-Z]{1,2}){1,3}$/, '') // enlever 1-3 lettres isolées en fin
    .trim()
    .toUpperCase();

  // Supprimer les artefacts OCR finaux fréquents (ex: "L KKLL", "K KLLL", etc.)
  // On ne touche qu'aux suffixes composés uniquement de K/L (souvent issus de "<" mal reconnu)
  s = s.replace(/(\s+[KL]{2,})+$/g, '').trim();

  // Re-passer une suppression de tokens isolés après nettoyage (ex: " ... L")
  s = s.replace(/(\s+[A-Z]{1,2}){1,3}$/, '').trim();

  return s;
}

// ── Extraction textuelle de secours ──────────────────────────────────────────
function extractFromText(text) {
  const upper = text.toUpperCase();
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let nom = '', prenom = '', dateNaissance = '', lieuNaissance = '';
  let numeroPasseport = '', numeroCNI = '';

  const ppMatch = upper.match(/\b([A-Z]{1,2}[0-9]{6,9})\b/);
  if (ppMatch) numeroPasseport = ppMatch[1];

  const cniMatch = upper.match(/\b(\d{13})\b/);
  if (cniMatch) numeroCNI = cniMatch[1];

  const dateMatch = upper.match(/(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/);
  if (dateMatch) dateNaissance = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toUpperCase();
    if (/\bNOM\b|\bSURNAME\b/.test(l) && !nom) {
      const after = l.split(/[:\/]/)[1];
      nom = (after || lines[i + 1] || '').toUpperCase().replace(/[^A-Z\s\-]/g, '').trim();
    }
    if (/\bPRÉNOM\b|\bPRENOM\b|\bGIVEN\b|\bFIRST\b/.test(l) && !prenom) {
      const after = l.split(/[:\/]/)[1];
      prenom = (after || lines[i + 1] || '').toUpperCase().replace(/[^A-Z\s\-]/g, '').trim();
    }
    if (/\bLIEU\b|\bPLACE\b/.test(l) && !lieuNaissance) {
      const after = l.split(/[:\/À]/)[1];
      lieuNaissance = (after || '').replace(/[^A-Z\s\-]/g, '').trim();
    }
  }

  return { nom, prenom, dateNaissance, lieuNaissance, numeroPasseport, numeroCNI };
}

// ── OCR sur un buffer image (utilise les workers persistants) ────────────────
async function runOcr(imageBuffer, workerType = 'mrz') {
  await initWorkers(); // no-op si déjà initialisé
  const worker = workerType === 'mrz' ? workerMrz
               : workerType === 'cni' ? workerCni
               : workerFull;
  const { data: { text } } = await worker.recognize(imageBuffer);
  return text;
}

// ── Scan passeport ────────────────────────────────────────────────────────────
async function scanPassport(buffer) {
  const [fullImg, mrzImg] = await Promise.all([
    preprocessFull(buffer),
    cropMrzZone(buffer),
  ]);

  // 2 passes OCR en parallèle (workers déjà chauds = ~1-2s au lieu de 9-12s)
  const [textMrzZone, textFull] = await Promise.all([
    runOcr(mrzImg, 'mrz'),
    runOcr(fullImg, 'full'),
  ]);

  // Chercher la MRZ dans les deux textes
  // PASS 1 (whitelist) est meilleur pour la ligne 2 (chiffres/lettres MRZ)
  // PASS 2 (sans whitelist) est meilleur pour la ligne 1 (noms avec <<)
  // Stratégie : combiner les deux
  const mrzFromPass1 = findMrzLines(textMrzZone);
  const mrzFromPass2 = findMrzLines(textFull);

  // Construire la meilleure combinaison
  let mrzLines = null;
  if (mrzFromPass1 && mrzFromPass2) {
    const line1Pass2 = mrzFromPass2[0];
    const line1Pass1 = mrzFromPass1[0];
    const scoreL1 = (l) => {
      if (!l) return -1;
      let s = 0;
      if (/^P</.test(l)) s += 200;
      else if (/^P[A-Z]</.test(l)) s += 50;
      const fixed = fixTd3Line1Prefix(l);
      if (fixed !== l && /^P</.test(fixed)) s += 80;
      s += Math.min(l.replace(/</g, '').length, 44);
      // Moins de « L » parasites (confusion avec « < ») et plus de « << » = meilleure ligne 1
      const lCount = (l.match(/L/g) || []).length;
      const sep = (l.match(/<</g) || []).length;
      s += sep * 25 - lCount * 12;
      return s;
    };
    const bestLine1 = scoreL1(line1Pass2) >= scoreL1(line1Pass1) ? line1Pass2 : line1Pass1;

    const line2VariantsFromPass1 = mrzFromPass1.slice(1);
    const line2VariantsFromPass2 = mrzFromPass2.slice(1);
    mrzLines = [bestLine1, ...line2VariantsFromPass1, ...line2VariantsFromPass2];
  } else {
    mrzLines = mrzFromPass1 || mrzFromPass2;
  }

  if (mrzLines) {
    const fields = tryParseMrz(mrzLines, { requirePassportPlausibility: true });
    if (fields) {
      return {
        type: 'passport',
        nom:    (fields.lastName  || '').replace(/</g, ' ').trim().toUpperCase(),
        prenom: cleanFirstName(fields.firstName),
        numeroPasseport: (fields.documentNumber || '').replace(/</g, '').trim(),
        dateNaissance: parseMrzDate(fields.birthDate),
        dateExpirationPasseport: parseMrzDate(fields.expirationDate),
        nationalite: fields.nationality || '',
        mrzDetectee: true,
      };
    }
  }

  // Fallback extraction textuelle
  const fallback = extractFromText(textFull);
  if (fallback.nom || fallback.numeroPasseport) {
    return {
      type: 'passport',
      ...fallback,
      mrzDetectee: false,
      avertissement: 'MRZ non détectée — extraction partielle. Vérifiez les champs.',
    };
  }

  return {
    type: 'passport',
    nom: '', prenom: '', numeroPasseport: '',
    dateNaissance: '', dateExpirationPasseport: '',
    mrzDetectee: false,
    avertissement: 'Document non lisible. Vérifiez la qualité de l\'image ou saisissez manuellement.',
  };
}

// ── Scan CNI ──────────────────────────────────────────────────────────────────
async function scanCNI(buffer) {
  const [fullImg, mrzImg] = await Promise.all([
    preprocessFull(buffer),
    cropMrzZone(buffer),
  ]);

  const [textMrzZone, textFull] = await Promise.all([
    runOcr(mrzImg, 'mrz'),
    runOcr(fullImg, 'cni'),
  ]);

  // TD1 (3×30) : format ICAO standard des cartes d’identité, prioritaire sur l’heuristique passeport TD3
  let fields =
    extractTd1MrzFields(textFull)
    || extractTd1MrzFields(textMrzZone);

  if (!fields) {
    const mrzFromPass1 = findMrzLines(textMrzZone);
    const mrzFromPass2 = findMrzLines(textFull);
    let mrzLines = null;
    if (mrzFromPass1 && mrzFromPass2) {
      const line1Pass2 = mrzFromPass2[0];
      const line1Pass1 = mrzFromPass1[0];
      const scoreL1 = (l) => {
        if (!l) return -1;
        let s = 0;
        if (/^P</.test(l)) s += 200;
        else if (/^P[A-Z]</.test(l)) s += 50;
        const fixed = fixTd3Line1Prefix(l);
        if (fixed !== l && /^P</.test(fixed)) s += 80;
        s += Math.min(l.replace(/</g, '').length, 44);
        const lCount = (l.match(/L/g) || []).length;
        const sep = (l.match(/<</g) || []).length;
        s += sep * 25 - lCount * 12;
        return s;
      };
      const bestLine1 = scoreL1(line1Pass2) >= scoreL1(line1Pass1) ? line1Pass2 : line1Pass1;
      mrzLines = [bestLine1, ...mrzFromPass1.slice(1), ...mrzFromPass2.slice(1)];
    } else {
      mrzLines = mrzFromPass1 || mrzFromPass2;
    }
    if (mrzLines) {
      fields = tryParseMrz(mrzLines, { requireCniPlausibility: true });
    }
  }

  if (fields) {
    return {
      type: 'id_card',
      nom:    (fields.lastName  || '').replace(/</g, ' ').trim().toUpperCase(),
      prenom: cleanFirstName(fields.firstName),
      numeroCNI: (fields.documentNumber || '').replace(/</g, '').trim(),
      dateNaissance: parseMrzDate(fields.birthDate),
      mrzDetectee: true,
    };
  }

  const extracted = extractFromText(textFull);
  return {
    type: 'id_card',
    nom:    extracted.nom,
    prenom: extracted.prenom,
    numeroCNI: extracted.numeroCNI,
    dateNaissance: extracted.dateNaissance,
    lieuNaissance: extracted.lieuNaissance,
    mrzDetectee: false,
    avertissement: extracted.nom
      ? 'Extraction partielle — vérifiez les champs.'
      : 'Peu de champs détectés. Vérifiez la qualité de l\'image.',
  };
}

module.exports = { scanPassport, scanCNI, initWorkers };
