import { useState, useEffect } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import { api, ApiError } from '../../lib/api';

interface PC {
  id: number;
  pcCode: string;
  aliasName: string | null;
  status: string;
}

interface Props {
  sessionId: number;
  currentPcCode: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransferModal({ sessionId, currentPcCode, onClose, onSuccess }: Props) {
  const [pcs, setPcs] = useState<PC[]>([]);
  const [targetPcId, setTargetPcId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<PC[]>('/api/pcs?status=available').then(setPcs).catch(console.error);
  }, []);

  const handleTransfer = async () => {
    if (!targetPcId) { setError('Pilih PC tujuan.'); return; }
    setIsLoading(true);
    setError('');
    try {
      await api.post(`/api/sessions/${sessionId}/transfer`, { targetPcId });
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Terjadi kesalahan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-card border border-card-border rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Pindahkan Sesi</h2>
            <p className="text-sm text-neutral-400">Dari {currentPcCode}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

        <div className="mb-4">
          <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">PC Tujuan (Available)</label>
          <div className="mt-2 space-y-2 max-h-52 overflow-y-auto pr-1">
            {pcs.length === 0 && <p className="text-neutral-500 text-sm text-center py-6">Tidak ada PC yang available.</p>}
            {pcs.map(pc => (
              <button key={pc.id} type="button" onClick={() => setTargetPcId(pc.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm border transition-all ${targetPcId === pc.id ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-white/5 border-white/5 text-neutral-300 hover:bg-white/10'}`}>
                <div className="w-2 h-2 rounded-full bg-emerald-400"/>
                <span className="font-medium">{pc.aliasName || pc.pcCode}</span>
                {pc.aliasName && <span className="text-neutral-500 text-xs">{pc.pcCode}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-medium text-neutral-300 bg-white/5 hover:bg-white/10 border border-white/5 transition-all">
            Batal
          </button>
          <button onClick={handleTransfer} disabled={isLoading || !targetPcId}
            className="flex-1 py-3 flex items-center justify-center gap-2 rounded-xl font-medium text-white bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover disabled:opacity-60 transition-all active:scale-[0.98]">
            <ArrowRightLeft className="w-4 h-4"/>
            {isLoading ? 'Memproses...' : 'Pindahkan'}
          </button>
        </div>
      </div>
    </div>
  );
}
