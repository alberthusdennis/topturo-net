import { useState, useEffect } from 'react';
import { X, Play } from 'lucide-react';
import { api, ApiError } from '../../lib/api';

interface Price {
  id: number;
  packageName: string;
  durationMinutes: number;
  priceMember: string;
  priceNonMember: string;
  isNightPackage: boolean;
}

interface Member {
  id: number;
  name: string;
  phoneNumber: string;
  status: string;
}

interface Props {
  pcId: number;
  pcCode: string;
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_METHODS = ['cash', 'qris', 'transfer', 'saldo'] as const;

export default function StartSessionModal({ pcId, pcCode, onClose, onSuccess }: Props) {
  const [prices, setPrices] = useState<Price[]>([]);
  const [selectedPriceId, setSelectedPriceId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [customerType, setCustomerType] = useState<'member' | 'guest'>('guest');
  const [guestName, setGuestName] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Price[]>('/api/prices').then(setPrices).catch(console.error);
  }, []);

  useEffect(() => {
    if (memberSearch.length < 2) { setMemberResults([]); return; }
    const timeout = setTimeout(async () => {
      try {
        const res = await api.get<Member[]>(`/api/members?search=${memberSearch}`);
        setMemberResults(res);
      } catch { setMemberResults([]); }
    }, 300);
    return () => clearTimeout(timeout);
  }, [memberSearch]);

  const selectedPrice = prices.find(p => p.id === selectedPriceId);
  const unitPrice = selectedPrice
    ? (customerType === 'member' ? parseFloat(selectedPrice.priceMember) : parseFloat(selectedPrice.priceNonMember))
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPriceId) { setError('Pilih paket harga terlebih dahulu.'); return; }
    if (customerType === 'member' && !selectedMember) { setError('Pilih member terlebih dahulu.'); return; }
    if (customerType === 'guest' && !guestName.trim()) { setError('Masukkan nama tamu.'); return; }

    setIsLoading(true);
    setError('');
    try {
      await api.post('/api/sessions', {
        pcId,
        priceId: selectedPriceId,
        paymentMethod,
        memberId: selectedMember?.id,
        guestName: customerType === 'guest' ? guestName : undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Terjadi kesalahan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-card border border-card-border rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Mulai Sesi</h2>
            <p className="text-sm text-neutral-400">{pcCode}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Type */}
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Tipe Pelanggan</label>
            <div className="flex gap-3 mt-2">
              {(['guest', 'member'] as const).map(t => (
                <button key={t} type="button" onClick={() => { setCustomerType(t); setSelectedMember(null); setMemberSearch(''); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${customerType === t ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10'}`}>
                  {t === 'guest' ? 'Non-Member' : 'Member'}
                </button>
              ))}
            </div>
          </div>

          {/* Guest Name / Member Search */}
          {customerType === 'guest' ? (
            <div>
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Nama Tamu</label>
              <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Nama tamu (opsional)"
                className="mt-2 w-full px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary transition-all"/>
            </div>
          ) : (
            <div className="relative">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Cari Member</label>
              <input type="text" value={selectedMember ? selectedMember.name : memberSearch} onChange={e => { setMemberSearch(e.target.value); setSelectedMember(null); }} placeholder="Nama atau no HP..."
                className="mt-2 w-full px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary transition-all"/>
              {memberResults.length > 0 && !selectedMember && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-card-border rounded-xl shadow-xl overflow-hidden">
                  {memberResults.map(m => (
                    <button key={m.id} type="button" onClick={() => { setSelectedMember(m); setMemberResults([]); }}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                      <p className="text-white text-sm font-medium">{m.name}</p>
                      <p className="text-neutral-400 text-xs">{m.phoneNumber}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Price Selection */}
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Paket Harga</label>
            <div className="mt-2 grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
              {prices.map(p => (
                <button key={p.id} type="button" onClick={() => setSelectedPriceId(p.id)}
                  className={`flex justify-between items-center px-4 py-3 rounded-xl text-sm border transition-all ${selectedPriceId === p.id ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-white/5 border-white/5 text-neutral-300 hover:bg-white/10'}`}>
                  <span className="font-medium">{p.packageName} ({p.durationMinutes} menit)</span>
                  <span className="font-bold">Rp {parseInt(customerType === 'member' ? p.priceMember : p.priceNonMember).toLocaleString('id')}</span>
                </button>
              ))}
              {prices.length === 0 && <p className="text-neutral-500 text-sm text-center py-4">Belum ada paket harga. Buat di menu Harga.</p>}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Metode Bayar</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {PAYMENT_METHODS.filter(m => m !== 'saldo' || customerType === 'member').map(m => (
                <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border capitalize transition-all ${paymentMethod === m ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Total */}
          {selectedPrice && (
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center">
              <span className="text-neutral-400 text-sm">Total</span>
              <span className="text-white font-bold text-lg">Rp {unitPrice.toLocaleString('id')}</span>
            </div>
          )}

          <button type="submit" disabled={isLoading || !selectedPriceId}
            className="w-full py-3 flex items-center justify-center gap-2 rounded-xl font-medium text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
            <Play className="w-4 h-4"/>
            {isLoading ? 'Memproses...' : 'Mulai Sesi'}
          </button>
        </form>
      </div>
    </div>
  );
}
