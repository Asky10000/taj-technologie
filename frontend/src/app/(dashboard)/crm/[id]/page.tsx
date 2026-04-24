'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Edit, Trash2, Building2, Phone, Mail,
  MapPin, CreditCard, MessageSquare, Plus, Calendar,
  User, Loader2,
} from 'lucide-react';
import {
  useCustomer, useCustomerContacts, useCustomerInteractions,
  useUpdateCustomer, useDeleteCustomer, useCreateContact, useCreateInteraction,
} from '@/hooks/useCrm';
import { CustomerStatusBadge } from '@/components/ui/Badge';
import { CustomerModal }       from '@/components/crm/CustomerModal';
import { Modal }               from '@/components/ui/Modal';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';
import type { InteractionType } from '@/types/crm.types';

const INTERACTION_ICONS: Record<InteractionType, string> = {
  CALL:      '📞',
  EMAIL:     '✉️',
  MEETING:   '🤝',
  VISIT:     '🏢',
  NOTE:      '📝',
  PROPOSAL:  '📄',
  COMPLAINT: '⚠️',
  OTHER:     '💬',
};

const INTERACTION_LABELS: Record<InteractionType, string> = {
  CALL:      'Appel',
  EMAIL:     'Email',
  MEETING:   'Réunion',
  VISIT:     'Visite',
  NOTE:      'Note',
  PROPOSAL:  'Proposition',
  COMPLAINT: 'Réclamation',
  OTHER:     'Autre',
};

export default function CustomerDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();

  const [showEditModal,        setShowEditModal]        = useState(false);
  const [showContactModal,     setShowContactModal]     = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [newContact,     setNewContact]     = useState({ firstName: '', lastName: '', email: '', phone: '', jobTitle: '' });
  const [newInteraction, setNewInteraction] = useState<{type: InteractionType; subject: string; notes: string}>({
    type: 'CALL', subject: '', notes: '',
  });

  const { data: customer, isLoading }   = useCustomer(id);
  const { data: contacts = [] }         = useCustomerContacts(id);
  const { data: interactions = [] }     = useCustomerInteractions(id);
  const deleteMutation                  = useDeleteCustomer();
  const createContact                   = useCreateContact(id);
  const createInteraction               = useCreateInteraction(id);

  const handleDelete = async () => {
    if (!confirm(`Supprimer le client "${customer?.name}" ?`)) return;
    await deleteMutation.mutateAsync(id);
    router.push('/crm');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/crm"
            className="w-8 h-8 flex items-center justify-center rounded-md border border-input hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-base font-semibold text-foreground">{customer.name}</h2>
            <p className="text-xs text-muted-foreground">{customer.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 h-9 px-3 rounded-md border border-input text-sm hover:bg-accent transition-colors"
          >
            <Edit className="w-4 h-4" /> Modifier
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-2 h-9 px-3 rounded-md border border-destructive/50 text-destructive text-sm hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-5">
          {/* Informations générales */}
          <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Informations générales</h3>
              <CustomerStatusBadge status={customer.status} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Building2, label: 'Type',       value: customer.type === 'COMPANY' ? 'Entreprise' : 'Particulier' },
                { icon: Mail,      label: 'Email',      value: customer.email },
                { icon: Phone,     label: 'Téléphone',  value: customer.phone },
                { icon: MapPin,    label: 'Adresse',    value: [customer.addressLine1, customer.postalCode, customer.city].filter(Boolean).join(', ') },
                { icon: CreditCard, label: 'N° TVA',   value: customer.taxId },
                { icon: Calendar,  label: 'Client depuis', value: formatDate(customer.createdAt) },
              ].filter((f) => f.value).map((field) => (
                <div key={field.label} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <field.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{field.label}</p>
                    <p className="text-sm text-foreground">{field.value}</p>
                  </div>
                </div>
              ))}
            </div>
            {customer.notes && (
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{customer.notes}</p>
              </div>
            )}
          </div>

          {/* Historique des interactions */}
          <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">
                Interactions
                {interactions.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    ({interactions.length})
                  </span>
                )}
              </h3>
              <button
                onClick={() => setShowInteractionModal(true)}
                className="flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
              >
                <Plus className="w-3 h-3" /> Ajouter
              </button>
            </div>

            {interactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aucune interaction enregistrée
              </p>
            ) : (
              <div className="space-y-3">
                {interactions.map((inter) => (
                  <div
                    key={inter.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-base flex-shrink-0">
                      {INTERACTION_ICONS[inter.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-primary">
                          {INTERACTION_LABELS[inter.type]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(inter.occurredAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-0.5">{inter.subject}</p>
                      {inter.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {inter.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite — facturation + contacts */}
        <div className="space-y-5">
          {/* Conditions commerciales */}
          <div className="bg-card border rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Conditions commerciales</h3>
            {[
              { label: 'Limite de crédit',   value: formatCurrency(customer.creditLimit) },
              { label: 'Délai de paiement',  value: `${customer.paymentTermsDays} jours` },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-sm font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Contacts */}
          <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">
                Contacts ({contacts.length})
              </h3>
              <button
                onClick={() => setShowContactModal(true)}
                className="flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
              >
                <Plus className="w-3 h-3" /> Ajouter
              </button>
            </div>

            {contacts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Aucun contact
              </p>
            ) : (
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <div key={contact.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground">
                          {contact.firstName} {contact.lastName}
                        </p>
                        {contact.isPrimary && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                            Principal
                          </span>
                        )}
                      </div>
                      {contact.jobTitle && (
                        <p className="text-xs text-muted-foreground">{contact.jobTitle}</p>
                      )}
                      {contact.email && (
                        <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Liens rapides */}
          <div className="bg-card border rounded-xl p-5 space-y-2">
            <h3 className="text-sm font-semibold text-foreground mb-3">Accès rapide</h3>
            {[
              { label: 'Voir les devis',    href: `/sales?customerId=${id}&tab=quotes` },
              { label: 'Voir les factures', href: `/sales?customerId=${id}&tab=invoices` },
              { label: 'Voir les tickets',  href: `/tickets?customerId=${id}` },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                → {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {customer && (
        <CustomerModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          customer={customer}
        />
      )}

      {/* Modal ajout contact */}
      <Modal open={showContactModal} onClose={() => setShowContactModal(false)} title="Nouveau contact" size="sm">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await createContact.mutateAsync(newContact);
            setShowContactModal(false);
            setNewContact({ firstName: '', lastName: '', email: '', phone: '', jobTitle: '' });
          }}
          className="space-y-4"
        >
          {(['firstName', 'lastName', 'jobTitle', 'email', 'phone'] as const).map((field) => (
            <div key={field} className="space-y-1.5">
              <label className="text-sm font-medium text-foreground capitalize">
                {field === 'firstName' ? 'Prénom' : field === 'lastName' ? 'Nom' : field === 'jobTitle' ? 'Poste' : field === 'email' ? 'Email' : 'Téléphone'}
              </label>
              <input
                value={newContact[field]}
                onChange={(e) => setNewContact((p) => ({ ...p, [field]: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => setShowContactModal(false)} className="h-9 px-4 rounded-md border text-sm hover:bg-accent transition-colors">Annuler</button>
            <button type="submit" disabled={createContact.isPending} className="h-9 px-4 rounded-md bg-primary text-white text-sm disabled:opacity-50 flex items-center gap-2">
              {createContact.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Ajouter
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal ajout interaction */}
      <Modal open={showInteractionModal} onClose={() => setShowInteractionModal(false)} title="Nouvelle interaction" size="sm">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await createInteraction.mutateAsync({ ...newInteraction, occurredAt: new Date().toISOString() });
            setShowInteractionModal(false);
            setNewInteraction({ type: 'CALL', subject: '', notes: '' });
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type</label>
            <select
              value={newInteraction.type}
              onChange={(e) => setNewInteraction((p) => ({ ...p, type: e.target.value as InteractionType }))}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {Object.entries(INTERACTION_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Sujet <span className="text-destructive">*</span></label>
            <input
              required
              value={newInteraction.subject}
              onChange={(e) => setNewInteraction((p) => ({ ...p, subject: e.target.value }))}
              placeholder="Ex: Appel de suivi commande"
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <textarea
              value={newInteraction.notes}
              onChange={(e) => setNewInteraction((p) => ({ ...p, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => setShowInteractionModal(false)} className="h-9 px-4 rounded-md border text-sm hover:bg-accent transition-colors">Annuler</button>
            <button type="submit" disabled={createInteraction.isPending} className="h-9 px-4 rounded-md bg-primary text-white text-sm disabled:opacity-50 flex items-center gap-2">
              {createInteraction.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
