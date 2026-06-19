import { useState } from 'react';
import { X, PowerOff } from 'lucide-react';
import { api, ApiError } from '../../lib/api';

interface Props {
  sessionId: number;
  pcCode: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EndSessionModal({ sessionId, pcCode, onClose, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEnd = async () => {
    setIsLoading(true);
    setError('');
    try {
      await api.post(`/api/sessions/${sessionId}/end`);
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
          <h2 className="text-xl font-bold text-white">Akhiri Sesi</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
        </div>

        <div className="flex flex-col items-center text-center py-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
            <PowerOff className="w-8 h-8 text-rose-400"/>
          </div>
          <p className="text-white font-medium">Akhiri sesi di <span className="text-rose-400">{pcCode}</span>?</p>
          <p className="text-neutral-400 text-sm mt-2">Sisa waktu tidak akan dikembalikan. PC akan kembali ke status Available.</p>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-medium text-neutral-300 bg-white/5 hover:bg-white/10 border border-white/5 transition-all">
            Batal
          </button>
          <button onClick={handleEnd} disabled={isLoading}
            className="flex-1 py-3 rounded-xl font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 transition-all active:scale-[0.98]">
            {isLoading ? 'Memproses...' : 'Ya, Akhiri'}
          </button>
        </div>
      </div>
    </div>
  );
}
