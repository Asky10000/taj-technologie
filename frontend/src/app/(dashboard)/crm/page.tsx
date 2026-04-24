'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Building2, RefreshCw, Phone, Mail, MapPin } from 'lucide-react';
import { useCustomers, useDeleteCustomer } from '@/hooks/useCrm';
import { CustomerStatusBadge } from '@/components/ui/Badge';
import { Pagination }          from '@/components/ui/Pagination';
import { EmptyState }          from '@/components/ui/EmptyState';
import { SearchInput }         from '@/components/ui/SearchInput';
import { CustomerModal }       from '@/components/crm/CustomerModal';
import { cn }                  from '@/lib/utils';
import type { CustomerStatus } from '@/types/crm.types';

const STATUS_FILTERS: { label: string; value: CustomerStatus | '' }[] = [
  { label: 'Tous',       value: ''            },
  { label: 'Actifs',     value: 'ACTIVE'      },
  { label: 'Inactifs',   value: 'INACTIVE'    },
  { label: 'Bloqués',    value: 'BLACKLISTED' },
];

export default function CustomersPage() {
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CustomerStatus | ''>('');
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading, isFetching } = useCustomers({
    page, limit: 20, search: search || undefined, status: status || undefined,
  });
  const deleteMutation = useDeleteCustomer();

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatus = (v: CustomerStatus | '') => { setStatus(v); setPage(1); };

  return (
    <div className="space-y-5">
      {/* Barre d'outils */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder="Nom, code, email…"
            className="w-64"
          />
          <div className="flex items-center gap-1 border border-input rounded-md p-0.5 bg-background">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => handleStatus(f.value)}
                className={cn(
                  'px-3 py-1 rounded text-xs font-medium transition-colors',
                  status === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          {isFetching && (
            <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau client
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-card border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-lg bg-muted animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-40 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={Building2}
            title="Aucun client trouvé"
            description="Créez votre premier client ou modifiez vos filtres."
            action={
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" /> Nouveau client
              </button>
            }
          />
        ) : (
          <>
            {/* En-tête */}
            <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-5 py-2.5 border-b border-border bg-muted/30">
              <span />
              <span className="text-xs font-semibold text-muted-foreground">CLIENT</span>
              <span className="text-xs font-semibold text-muted-foreground hidden md:block">CONTACT</span>
              <span className="text-xs font-semibold text-muted-foreground hidden lg:block">VILLE</span>
              <span className="text-xs font-semibold text-muted-foreground">STATUT</span>
            </div>

            <div className="divide-y divide-border">
              {data.items.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/crm/${customer.id}`}
                  className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-5 py-3.5 items-center hover:bg-accent/50 transition-colors group"
                >
                  {/* Icône */}
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>

                  {/* Nom + code */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {customer.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{customer.code}</p>
                  </div>

                  {/* Contact */}
                  <div className="hidden md:block min-w-0 space-y-0.5">
                    {customer.email && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Ville */}
                  {customer.city ? (
                    <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span>{customer.city}</span>
                    </div>
                  ) : (
                    <span className="hidden lg:block" />
                  )}

                  {/* Statut */}
                  <CustomerStatusBadge status={customer.status} />
                </Link>
              ))}
            </div>

            {/* Pagination */}
            <div className="border-t border-border px-5">
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                limit={data.limit}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      {/* Modal création */}
      <CustomerModal
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
