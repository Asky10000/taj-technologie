'use client';

import { formatCurrency, formatDate } from '@/lib/utils';
import type { SaleLine } from '@/types/sales.types';

interface MetaRow { label: string; value: string; }

interface SaleDocumentPrintProps {
  docType:   string;                 // « Devis », « Bon de commande », « Facture »
  number:    string;
  statusLabel: string;
  customerName?: string;
  meta:      MetaRow[];              // dates, échéance, etc.
  lines:     SaleLine[];
  totalHT:   number;
  totalTTC:  number;
  notes?:    string;
  payment?:  { paid: number; remaining: number };
}

function lineHT(l: SaleLine): number {
  const base = Number(l.quantity) * Number(l.unitPrice);
  const disc = Number(l.discountValue ?? 0);
  const ht = l.discountType === 'FIXED' ? base - disc : base * (1 - disc / 100);
  return Math.round(ht);
}

/**
 * Document formaté A4 pour impression / export PDF.
 * Masqué à l'écran (.print-only) et révélé uniquement à l'impression.
 * Couleurs volontairement figées (indépendantes du thème) pour le papier.
 */
export function SaleDocumentPrint(props: SaleDocumentPrintProps) {
  const { docType, number, statusLabel, customerName, meta, lines, totalHT, totalTTC, notes, payment } = props;
  const totalTVA = Math.round(Number(totalTTC) - Number(totalHT));

  return (
    <div
      className="print-only print-area"
      style={{ color: '#111827', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12, lineHeight: 1.5 }}
    >
      {/* En-tête émetteur + document */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #2563eb', paddingBottom: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#2563eb' }}>TAJ Technologie</div>
          <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>
            ERP / CRM — Solutions informatiques<br />
            Abidjan, Côte d'Ivoire<br />
            contact@taj-tech.com
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{docType}</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{number}</div>
          <div style={{ display: 'inline-block', marginTop: 6, padding: '2px 10px', border: '1px solid #9ca3af', borderRadius: 4, fontSize: 11, color: '#374151' }}>{statusLabel}</div>
        </div>
      </div>

      {/* Client + méta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, marginBottom: 4 }}>Client</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{customerName ?? '—'}</div>
        </div>
        <div style={{ minWidth: 220 }}>
          {meta.map((m) => (
            <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 3 }}>
              <span style={{ color: '#6b7280' }}>{m.label}</span>
              <span style={{ fontWeight: 600 }}>{m.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tableau des lignes */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ ...th, textAlign: 'left' }}>Désignation</th>
            <th style={{ ...th, width: 50 }}>Qté</th>
            <th style={{ ...th, width: 90 }}>P.U. HT</th>
            <th style={{ ...th, width: 50 }}>TVA%</th>
            <th style={{ ...th, width: 60 }}>Remise%</th>
            <th style={{ ...th, width: 100 }}>Total HT</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={l.id ?? i}>
              <td style={{ ...td, textAlign: 'left' }}>
                {l.description}
                {l.product?.sku && <span style={{ color: '#9ca3af', fontSize: 10 }}> · {l.product.sku}</span>}
              </td>
              <td style={tdNum}>{Number(l.quantity)}</td>
              <td style={tdNum}>{formatCurrency(Number(l.unitPrice))}</td>
              <td style={tdNum}>{Number(l.taxRate)}</td>
              <td style={tdNum}>{Number(l.discountValue ?? 0)}</td>
              <td style={{ ...tdNum, fontWeight: 600 }}>{formatCurrency(lineHT(l))}</td>
            </tr>
          ))}
          {lines.length === 0 && (
            <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#9ca3af' }}>Aucune ligne</td></tr>
          )}
        </tbody>
      </table>

      {/* Totaux */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <div style={{ width: 260 }}>
          <div style={totalRow}><span style={{ color: '#6b7280' }}>Total HT</span><span style={{ fontWeight: 600 }}>{formatCurrency(Number(totalHT))}</span></div>
          <div style={totalRow}><span style={{ color: '#6b7280' }}>TVA</span><span style={{ fontWeight: 600 }}>{formatCurrency(totalTVA)}</span></div>
          <div style={{ ...totalRow, borderTop: '2px solid #111827', marginTop: 4, paddingTop: 8, fontSize: 15, fontWeight: 700 }}>
            <span>Total TTC</span><span style={{ color: '#2563eb' }}>{formatCurrency(Number(totalTTC))}</span>
          </div>
          {payment && (
            <>
              <div style={{ ...totalRow, marginTop: 8 }}><span style={{ color: '#6b7280' }}>Payé</span><span style={{ fontWeight: 600, color: '#059669' }}>{formatCurrency(payment.paid)}</span></div>
              <div style={totalRow}><span style={{ color: '#6b7280' }}>Reste à payer</span><span style={{ fontWeight: 700 }}>{formatCurrency(payment.remaining)}</span></div>
            </>
          )}
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, marginBottom: 4 }}>Notes</div>
          <div style={{ whiteSpace: 'pre-wrap', color: '#374151' }}>{notes}</div>
        </div>
      )}

      {/* Pied de page */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, marginTop: 32, textAlign: 'center', fontSize: 10, color: '#9ca3af' }}>
        TAJ Technologie — Document généré le {formatDate(new Date())} · Montants en francs CFA (XOF)
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: '8px 10px', fontSize: 10, textTransform: 'uppercase', color: '#374151', textAlign: 'right', borderBottom: '1px solid #d1d5db' };
const td: React.CSSProperties = { padding: '7px 10px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' };
const tdNum: React.CSSProperties = { ...td, fontVariantNumeric: 'tabular-nums' };
const totalRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '3px 0' };
