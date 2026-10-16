'use client';

import { formatDate } from '@/lib/utils';
import type { Intervention } from '@/types/intervention.types';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon',
  COMPLETED: 'Terminé',
};

/**
 * Fiche d'intervention formatée A4 pour impression / export PDF.
 * Masquée à l'écran (.print-only) et révélée uniquement à l'impression.
 */
export function InterventionPrint({ intervention: i }: { intervention: Intervention }) {
  const tech = i.technician ? `${i.technician.firstName} ${i.technician.lastName}` : '—';

  return (
    <div
      className="print-only print-area"
      style={{ color: '#111827', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12, lineHeight: 1.5 }}
    >
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #2563eb', paddingBottom: 16, marginBottom: 24 }}>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="TAJ Technologie" style={{ height: 56, marginBottom: 8 }} />
          <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>
            ERP / CRM — Solutions informatiques<br />
            Abidjan, Côte d&apos;Ivoire<br />
            contact@taj-tech.com
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Fiche d&apos;intervention</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{i.number}</div>
          <div style={{ display: 'inline-block', marginTop: 6, padding: '2px 10px', border: '1px solid #9ca3af', borderRadius: 4, fontSize: 11, color: '#374151' }}>
            {STATUS_LABEL[i.status] ?? i.status}
          </div>
        </div>
      </div>

      {/* Client + méta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, marginBottom: 4 }}>Client</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{i.customer?.name ?? '—'}</div>
          {i.customer?.city && <div style={{ color: '#6b7280', fontSize: 11 }}>{i.customer.city}</div>}
          {i.customer?.phone && <div style={{ color: '#6b7280', fontSize: 11 }}>{i.customer.phone}</div>}
        </div>
        <div style={{ minWidth: 240 }}>
          {[
            { label: 'Date de visite', value: formatDate(i.visitDate) },
            { label: 'Technicien', value: tech },
            { label: 'Objet', value: i.subject || '—' },
          ].map((m) => (
            <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 3 }}>
              <span style={{ color: '#6b7280' }}>{m.label}</span>
              <span style={{ fontWeight: 600, textAlign: 'right' }}>{m.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      {[
        { title: 'Anomalies constatées', value: i.anomalies },
        { title: 'Observations', value: i.observations },
        { title: 'Suggestions', value: i.suggestions },
      ].map((s) => (
        <div key={s.title} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#2563eb', fontWeight: 700, borderBottom: '1px solid #e5e7eb', paddingBottom: 4, marginBottom: 6 }}>
            {s.title}
          </div>
          <div style={{ whiteSpace: 'pre-wrap', color: '#374151', minHeight: 36 }}>{s.value || '—'}</div>
        </div>
      ))}

      {/* Signatures */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 48, marginTop: 40 }}>
        {['Signature technicien', 'Signature client'].map((label) => (
          <div key={label} style={{ flex: 1 }}>
            <div style={{ borderTop: '1px solid #9ca3af', paddingTop: 6, color: '#6b7280', fontSize: 11 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Pied de page */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, marginTop: 32, textAlign: 'center', fontSize: 10, color: '#9ca3af' }}>
        TAJ Technologie — Document généré le {formatDate(new Date())}
      </div>
    </div>
  );
}
