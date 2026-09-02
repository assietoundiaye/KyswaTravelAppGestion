/**
 * NumberInput — Champ de saisie numérique avec formatage automatique des milliers
 * Affiche: "1 500 000" / stocke: 1500000
 *
 * Props:
 *  - value       : valeur brute (nombre ou string) stockée dans le state
 *  - onChange    : callback(rawNumber: number) appelé à chaque saisie
 *  - className   : classe CSS appliquée à l'input
 *  - placeholder : placeholder affiché si vide
 *  - min         : valeur minimum
 *  - required    : champ obligatoire
 *  - disabled    : désactiver le champ
 *  - style       : styles inline additionnels
 */
import { useState, useEffect, useRef } from 'react';

const formatWithSpaces = (raw) => {
  if (raw === '' || raw === null || raw === undefined) return '';
  const num = String(raw).replace(/\D/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('fr-FR');
};

const parseRaw = (formatted) => {
  // Supprime espaces, points, virgules → garde uniquement les chiffres
  const digits = String(formatted).replace(/[\s\u00A0\u202F.]/g, '').replace(',', '.');
  const n = parseFloat(digits);
  return isNaN(n) ? '' : Math.floor(n);
};

export default function NumberInput({
  value,
  onChange,
  className = 'premium-input',
  placeholder = '0',
  min = 0,
  required = false,
  disabled = false,
  style = {},
}) {
  const [display, setDisplay] = useState(formatWithSpaces(value));
  const skipNextSync = useRef(false);

  // Synchronise depuis l'extérieur seulement si la valeur change réellement
  useEffect(() => {
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    const external = parseRaw(String(value));
    const internal = parseRaw(display);
    if (external !== internal) {
      setDisplay(formatWithSpaces(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value;
    // Autorise seulement chiffres + séparateurs
    const digitsOnly = raw.replace(/[\s\u00A0\u202F.]/g, '').replace(/[^\d]/g, '');
    const formatted = formatWithSpaces(digitsOnly);
    setDisplay(formatted);
    skipNextSync.current = true;
    const numVal = digitsOnly === '' ? '' : Number(digitsOnly);
    onChange(numVal);
  };

  const handleBlur = () => {
    // Reformate proprement à la sortie
    setDisplay(formatWithSpaces(parseRaw(display)));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
      placeholder={placeholder}
      min={min}
      required={required}
      disabled={disabled}
      style={style}
    />
  );
}
