'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Modal }  from '@/components/ui/Modal';
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/useCrm';
import { cn } from '@/lib/utils';
import type { Customer } from '@/types/crm.types';

const schema = z.object({
  name:             z.string().min(2, 'Nom requis (min 2 caractères)'),
  type:             z.enum(['COMPANY', 'INDIVIDUAL', 'ASSOCIATION', 'PUBLIC']),
  email:            z.string().email('Email invalide').optional().or(z.literal('')),
  phone:            z.string().optional(),
  addressLine1:     z.string().optional(),
  city:             z.string().optional(),
  postalCode:       z.string().optional(),
  taxId:            z.string().optional(),
  creditLimit:      z.coerce.number().min(0).default(0),
  paymentTermsDays: z.coerce.number().min(0).max(365).default(30),
  notes:            z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CustomerModalProps {
  open:       boolean;
  onClose:    () => void;
  customer?:  Customer;   // si fourni → mode édition
}

function Field({
  label, error, required, children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const inputClass = (error?: string) =>
  cn(
    'w-full h-9 px-3 rounded-md border bg-background text-sm',
    'placeholder:text-muted-foreground',
    'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors',
    error ? 'border-destructive' : 'border-input',
  );

export function CustomerModal({ open, onClose, customer }: CustomerModalProps) {
  const isEdit = !!customer;
  const create = useCreateCustomer();
  const update = useUpdateCustomer(customer?.id ?? '');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: customer
      ? {
          name:             customer.name,
          type:             customer.type,
          email:            customer.email ?? '',
          phone:            customer.phone ?? '',
          addressLine1:     customer.addressLine1 ?? '',
          city:             customer.city ?? '',
          postalCode:       customer.postalCode ?? '',
          taxId:            customer.taxId ?? '',
          creditLimit:      customer.creditLimit,
          paymentTermsDays: customer.paymentTermsDays,
          notes:            customer.notes ?? '',
        }
      : { type: 'COMPANY' as const, creditLimit: 0, paymentTermsDays: 30 },
  });

  const isPending = create.isPending || update.isPending;

  const onSubmit = async (values: FormValues) => {
    if (isEdit) {
      await update.mutateAsync(values);
    } else {
      await create.mutateAsync(values);
    }
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier le client' : 'Nouveau client'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Raison sociale / Nom" error={errors.name?.message} required>
            <input
              {...register('name')}
              placeholder="Ex: Mairie de Paris"
              className={inputClass(errors.name?.message)}
            />
          </Field>

          <Field label="Type" error={errors.type?.message} required>
            <select {...register('type')} className={inputClass(errors.type?.message)}>
              <option value="COMPANY">Entreprise</option>
              <option value="INDIVIDUAL">Particulier</option>
            </select>
          </Field>

          <Field label="Email" error={errors.email?.message}>
            <input
              {...register('email')}
              type="email"
              placeholder="contact@exemple.fr"
              className={inputClass(errors.email?.message)}
            />
          </Field>

          <Field label="Téléphone" error={errors.phone?.message}>
            <input
              {...register('phone')}
              type="tel"
              placeholder="01 23 45 67 89"
              className={inputClass(errors.phone?.message)}
            />
          </Field>

          <Field label="Adresse" error={errors.addressLine1?.message}>
            <input
              {...register('addressLine1')}
              placeholder="1 rue de la Paix"
              className={inputClass(errors.addressLine1?.message)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Code postal" error={errors.postalCode?.message}>
              <input
                {...register('postalCode')}
                placeholder="75001"
                className={inputClass(errors.postalCode?.message)}
              />
            </Field>
            <Field label="Ville" error={errors.city?.message}>
              <input
                {...register('city')}
                placeholder="Paris"
                className={inputClass(errors.city?.message)}
              />
            </Field>
          </div>

          <Field label="N° TVA / SIRET" error={errors.taxId?.message}>
            <input
              {...register('taxId')}
              placeholder="FR12 345678901"
              className={inputClass(errors.taxId?.message)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Limite de crédit (€)" error={errors.creditLimit?.message}>
              <input
                {...register('creditLimit')}
                type="number"
                min={0}
                step={100}
                className={inputClass(errors.creditLimit?.message)}
              />
            </Field>
            <Field label="Délai paiement (j)" error={errors.paymentTermsDays?.message}>
              <input
                {...register('paymentTermsDays')}
                type="number"
                min={0}
                max={365}
                className={inputClass(errors.paymentTermsDays?.message)}
              />
            </Field>
          </div>
        </div>

        <Field label="Notes internes" error={errors.notes?.message}>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Informations complémentaires…"
            className={cn(inputClass(errors.notes?.message), 'h-auto resize-none py-2')}
          />
        </Field>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-md border border-input text-sm text-foreground hover:bg-accent transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Enregistrer' : 'Créer le client'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
