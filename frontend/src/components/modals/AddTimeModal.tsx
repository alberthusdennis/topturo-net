import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { api, ApiError } from '../../lib/api';

interface Price {
  id: number;
  packageName: string;
  durationMinutes: number;
  priceMember: string;
  priceNonMember: string;
  isNightPackage: boolean;
}

interface Props {
  sessionId: number;
  pcCode: string;
  isMember: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_METHODS = ['cash', 'qris', 'transfer', 'saldo'] as const;

export default function AddTimeModal({ sessionId, pcCode, isMember, onClose, onSuccess }: Props) {
  const [prices, setPrices] = useState<Price[]>([]);
  const [selectedPriceId, setSelectedPriceId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Price[]>('/api/prices').then(setPrices).catch(console.error);
  }, []);

  const selectedPrice = prices.find(p => p.id === selectedPriceId);
  const unitPrice = selectedPrice
    ? (isMember ? parseFloat(selectedPrice.priceMember) : parseFloat(selectedPrice.priceNonMember))
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPriceId) { setError('Pilih paket harga.'); return; }

    setIsLoading(true);
    setError('');
    try {
      await api.post(`/api/sessions/${sessionId}/add-time`, { priceId: selectedPriceId, paymentMethod });
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setError(`Saldo tidak cukup. ${err.message}`);
      } else {
        setError(err instanceof ApiError ? err.message : 'Terjadi kesalahan.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-card border border-card-border rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Tambah Waktu</h2>
            <p className="text-sm text-neutral-400">{pcCode}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Paket Tambahan</label>
            <div className="mt-2 grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1">
              {prices.map(p => (
                <button key={p.id} type="button" onClick={() => setSelectedPriceId(p.id)}
                  className={`flex justify-between items-center px-4 py-3 rounded-xl text-sm border transition-all ${selectedPriceId === p.id ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-white/5 border-white/5 text-neutral-300 hover:bg-white/10'}`}>
                  <span className="font-medium">{p.packageName} ({p.durationMinutes} menit)</span>
                  <span className="font-bold">Rp {parseInt(isMember ? p.priceMember : p.priceNonMember).toLocaleString('id')}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Metode Bayar</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {PAYMENT_METHODS.filter(m => m !== 'saldo' || isMember).map(m => (
                <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border capitalize transition-all ${paymentMethod === m ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {selectedPrice && (
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center">
              <span className="text-neutral-400 text-sm">Total Tambahan</span>
              <span className="text-white font-bold text-lg">Rp {unitPrice.toLocaleString('id')}</span>
            </div>
          )}

          <button type="submit" disabled={isLoading || !selectedPriceId}
            className="w-full py-3 flex items-center justify-center gap-2 rounded-xl font-medium text-white bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
            <Plus className="w-4 h-4"/>
            {isLoading ? 'Memproses...' : 'Tambah Waktu'}
          </button>
        </form>
      </div>
    </div>
  );
}
