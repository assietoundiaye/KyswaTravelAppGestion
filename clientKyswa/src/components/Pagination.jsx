import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 50,
  onPageChange,
  onLimitChange,
  limitOptions = [25, 50, 100],
}) {
  if (totalItems <= 0 && totalPages <= 1) return null;

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Calcul des numéros de pages visibles avec ellipse intelligente
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        padding: '14px 16px',
        background: '#ffffff',
        borderTop: '1px solid rgba(0, 103, 79, 0.08)',
        borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
      }}
      className="pagination-container"
    >
      {/* Informations & Sélecteur par page */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
          Affichage de <strong style={{ color: 'var(--text-main)' }}>{startItem}</strong> à{' '}
          <strong style={{ color: 'var(--text-main)' }}>{endItem}</strong> sur{' '}
          <strong style={{ color: 'var(--text-main)' }}>{totalItems}</strong>
        </span>

        {onLimitChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Afficher :</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-main)',
                padding: '3px 8px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-main)',
                cursor: 'pointer',
              }}
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / page
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Contrôles de navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Première page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="Première page"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: currentPage === 1 ? 'transparent' : 'var(--bg-card)',
            color: currentPage === 1 ? '#d1d5db' : 'var(--text-main)',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Page précédente */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Page précédente"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: currentPage === 1 ? 'transparent' : 'var(--bg-card)',
            color: currentPage === 1 ? '#d1d5db' : 'var(--text-main)',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <ChevronLeft size={16} />
        </button>

        {/* Numéros de page */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {getPageNumbers().map((num, idx) => {
            if (num === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  style={{
                    padding: '0 4px',
                    color: 'var(--text-muted)',
                    fontSize: 13,
                    userSelect: 'none',
                  }}
                >
                  ...
                </span>
              );
            }

            const isActive = num === currentPage;
            return (
              <button
                key={`page-${num}`}
                onClick={() => onPageChange(num)}
                style={{
                  minWidth: 32,
                  height: 32,
                  padding: '0 6px',
                  borderRadius: 6,
                  border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-main)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {num}
              </button>
            );
          })}
        </div>

        {/* Page suivante */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="Page suivante"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: currentPage === totalPages ? 'transparent' : 'var(--bg-card)',
            color: currentPage === totalPages ? '#d1d5db' : 'var(--text-main)',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <ChevronRight size={16} />
        </button>

        {/* Dernière page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="Dernière page"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: currentPage === totalPages ? 'transparent' : 'var(--bg-card)',
            color: currentPage === totalPages ? '#d1d5db' : 'var(--text-main)',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}
