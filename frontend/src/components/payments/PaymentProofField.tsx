'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { uploadPaymentProof } from '@/hooks/usePayments';
import { mediaUrl } from '@/lib/api';

interface Props {
  value?: string;
  onChange: (url?: string) => void;
}

export function PaymentProofField({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 5 Mo).');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadPaymentProof(file);
      onChange(url);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Échec de l\'import du fichier');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const isPdf = value?.toLowerCase().endsWith('.pdf');

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={handleFile}
      />
      {value ? (
        <div className="flex items-center gap-3 border border-input rounded-md p-2">
          {isPdf ? (
            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(value)} alt="Preuve de paiement" className="w-12 h-12 rounded object-cover border border-border flex-shrink-0" />
          )}
          <a href={mediaUrl(value)} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex-1 truncate">
            Voir le fichier importé
          </a>
          <button type="button" onClick={() => onChange(undefined)} className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors" title="Retirer">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 h-9 px-3 rounded-md border border-dashed border-input text-sm text-muted-foreground hover:text-foreground hover:border-ring transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Import en cours…' : 'Importer une image / un PDF'}
        </button>
      )}
    </div>
  );
}
