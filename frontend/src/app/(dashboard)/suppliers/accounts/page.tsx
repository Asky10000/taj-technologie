'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Truck } from 'lucide-react';
import { useSupplierAccounts } from '@/hooks/useSuppliers';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { formatCurrency, cn } from '@/lib/utils';

export default function SupplierAccountsPage() {
  const [search, setSearch] = useState('');
  const { data: accounts, isLoading } = useSupplierAccounts();

  const filtered = useMemo(
    () => (accounts ?? []).filter((a) =>
      !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.code ?? '').toLowerCase().includes(search.toLowerCase()),
    ),
    [accounts, search],
  );

  const totals = (accounts ?? []).reduce(
    (s, a) => ({ ordered: s.ordered + a.ordered, paid: s.paid + a.paid, balance: s.balance + a.balance }),
    { ordered: 0, paid: 0, balance: 0 },
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total commandé</p>
          <p className="text-xl font-bold text-foreground mt-1 tabular-nums">{formatCurrency(totals.ordered)}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Payé</p>
          <p className="text-xl font-bold text-emerald-500 mt-1 tabular-nums">{formatCurrency(totals.paid)}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Dettes fournisseurs (à payer)</p>
          <p className="text-xl font-bold text-amber-400 mt-1 tabular-nums">{formatCurrency(totals.balance)}</p>
        </div>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un fournisseur…" className="w-full sm:w-72" />

      <div className="bg-card border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Truck} title="Aucun compte fournisseur" description="Les comptes apparaissent dès qu'un fournisseur possède une commande." />
        ) : (
          <>
            <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_90px_150px_150px_150px] px-5 py-2.5 border-b bg-muted/30 text-xs font-semibold text-muted-foreground divide-x divide-border [&>*]:px-3 [&>*:first-child]:pl-0">
              <span>FOURNISSEUR</span>
              <span className="text-center">COMMANDES</span>
              <span className="text-right">TOTAL COMMANDÉ</span>
              <span className="text-right">PAYÉ</span>
              <span className="text-right">SOLDE À PAYER</span>
            </div>
            <div className="divide-y divide-border">
              {filtered.map((a) => (
                <Link key={a.supplierId} href={`/suppliers/accounts/${a.supplierId}`}
                  className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_90px_150px_150px_150px] gap-2 sm:gap-0 sm:divide-x sm:divide-border px-5 py-3.5 items-center hover:bg-accent/30 transition-colors sm:[&>*]:px-3 sm:[&>*:first-child]:pl-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                    {a.code && <p className="text-xs text-muted-foreground">{a.code}</p>}
                  </div>
                  <span className="hidden sm:block text-sm text-muted-foreground text-center tabular-nums">{a.count}</span>
                  <span className="hidden sm:block text-sm text-right tabular-nums">{formatCurrency(a.ordered)}</span>
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
