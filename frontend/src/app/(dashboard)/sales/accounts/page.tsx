'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Users, AlertTriangle } from 'lucide-react';
import { useCustomerAccounts } from '@/hooks/useSales';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { formatCurrency, cn } from '@/lib/utils';

export default function CustomerAccountsPage() {
  const [search, setSearch] = useState('');
  const { data: accounts, isLoading } = useCustomerAccounts();

  const filtered = useMemo(
    () => (accounts ?? []).filter((a) =>
      !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.code ?? '').toLowerCase().includes(search.toLowerCase()),
    ),
    [accounts, search],
  );

  const totals = (accounts ?? []).reduce(
    (s, a) => ({ invoiced: s.invoiced + a.invoiced, paid: s.paid + a.paid, balance: s.balance + a.balance }),
    { invoiced: 0, paid: 0, balance: 0 },
  );

  return (
    <div className="space-y-5">
      {/* Synthèse */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total facturé</p>
          <p className="text-xl font-bold text-foreground mt-1 tabular-nums">{formatCurrency(totals.invoiced)}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Encaissé</p>
          <p className="text-xl font-bold text-emerald-500 mt-1 tabular-nums">{formatCurrency(totals.paid)}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Créances clients (solde dû)</p>
          <p className="text-xl font-bold text-amber-400 mt-1 tabular-nums">{formatCurrency(totals.balance)}</p>
        </div>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un client…" className="w-full sm:w-72" />

      <div className="bg-card border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="Aucun compte client" description="Les comptes apparaissent dès qu'un client possède une facture." />
        ) : (
          <>
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b bg-muted/30">
              {['CLIENT', 'FACTURES', 'TOTAL FACTURÉ', 'ENCAISSÉ', 'SOLDE DÛ'].map((h) => (
                <span key={h} className="text-xs font-semibold text-muted-foreground last:text-right">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-border">
              {filtered.map((a) => (
                <Link key={a.customerId} href={`/sales/accounts/${a.customerId}`}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2 sm:gap-4 px-5 py-3.5 items-center hover:bg-accent/30 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                      {a.name}
                      {a.overdue > 0 && <span className="inline-flex items-center gap-1 text-[10px] text-red-400"><AlertTriangle className="w-3 h-3" />{a.overdue} en retard</span>}
                    </p>
                    {a.code && <p className="text-xs text-muted-foreground">{a.code}</p>}
                  </div>
                  <span className="hidden sm:block text-sm text-muted-foreground text-center tabular-nums">{a.count}</span>
                  <span className="hidden sm:block text-sm text-right tabular-nums">{formatCurrency(a.invoiced)}</span>
                  <span className="hidden sm:block text-sm text-right text-emerald-500 tabular-nums">{formatCurrency(a.paid)}</span>
                  <span className={cn('text-sm text-right font-semibold tabular-nums', a.balance > 0 ? 'text-amber-400' : 'text-emerald-500')}>
                    {formatCurrency(a.balance)}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
