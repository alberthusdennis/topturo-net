import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import { api, ApiError } from '../../lib/api';
import { Plus, Edit2, Trash2, X, Check, Monitor, Wrench, CheckCircle } from 'lucide-react';

interface PC {
  id: number;
  pcCode: string;
  aliasName: string | null;
  notes: string | null;
  status: 'available' | 'active' | 'maintenance';
  createdAt: string;
}

export default function PcManagementPage() {
  const [pcs, setPcs] = useState<PC[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<PC | null>(null);

  const fetchPcs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<PC[]>('/api/pcs');
      setPcs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPcs(); }, [fetchPcs]);

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus PC ini?')) return;
    try {
      await api.delete(`/api/pcs/${id}`);
      fetchPcs();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal menghapus PC.');
    }
  };

  const handleStatusToggle = async (pc: PC) => {
    const nextStatus = pc.status === 'maintenance' ? 'available' : 'maintenance';
    if (!confirm(`Ubah status ${pc.pcCode} ke "${nextStatus}"?`)) return;
    try {
      await api.put(`/api/pcs/${pc.id}`, { status: nextStatus });
      fetchPcs();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal mengubah status.');
    }
  };

  const statusConfig: Record<string, { label: string; className: string }> = {
    available: { label: 'Available', className: 'bg-emerald-500/10 text-emerald-400' },
    active: { label: 'Active', className: 'bg-primary/10 text-primary' },
    maintenance: { label: 'Maintenance', className: 'bg-rose-500/10 text-rose-400' },
  };

  return (
    <div className="flex min-h-screen bg-dark">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Manage PCs</h1>
            <p className="text-neutral-400">Kelola dan pantau semua station</p>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover hover:to-purple-700 transition-all active:scale-[0.98] shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4"/> Tambah PC
          </button>
        </header>

        <div className="glass rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">PC</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Alias</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Notes</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-12 text-neutral-500">Memuat data...</td></tr>
              ) : pcs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-neutral-500">Belum ada PC terdaftar.</td></tr>
              ) : (
                pcs.map(pc => (
                  <tr key={pc.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white/5">
                          <Monitor className="w-4 h-4 text-neutral-400"/>
                        </div>
                        <span className="text-white font-bold font-mono">{pc.pcCode}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-300">{pc.aliasName || <span className="text-neutral-600">—</span>}</td>
                    <td className="px-6 py-4 text-neutral-400 text-sm max-w-xs truncate">{pc.notes || <span className="text-neutral-600">—</span>}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig[pc.status]?.className}`}>
                        {statusConfig[pc.status]?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => handleStatusToggle(pc)} disabled={pc.status === 'active'}
                          title={pc.status === 'maintenance' ? 'Set Available' : 'Set Maintenance'}
                          className={`p-2 rounded-lg transition-colors ${pc.status === 'active' ? 'opacity-30 cursor-not-allowed' : pc.status === 'maintenance' ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'}`}>
                          {pc.status === 'maintenance' ? <CheckCircle className="w-4 h-4"/> : <Wrench className="w-4 h-4"/>}
                        </button>
                        <button onClick={() => setEditTarget(pc)} title="Edit"
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors">
                          <Edit2 className="w-4 h-4"/>
                        </button>
                        <button onClick={() => handleDelete(pc.id)} disabled={pc.status === 'active'} title="Hapus"
                          className={`p-2 rounded-lg transition-colors ${pc.status === 'active' ? 'opacity-30 cursor-not-allowed' : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300'}`}>
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {(showAddModal || editTarget) && (
        <PcFormModal
          pc={editTarget || null}
          onClose={() => { setShowAddModal(false); setEditTarget(null); }}
          onSuccess={() => { setShowAddModal(false); setEditTarget(null); fetchPcs(); }}
        />
      )}
    </div>
  );
}

function PcFormModal({ pc, onClose, onSuccess }: { pc: PC | null; onClose: () => void; onSuccess: () => void }) {
  const [pcCode, setPcCode] = useState(pc?.pcCode || '');
  const [aliasName, setAliasName] = useState(pc?.aliasName || '');
  const [notes, setNotes] = useState(pc?.notes || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      if (pc) {
        await api.put(`/api/pcs/${pc.id}`, { aliasName: aliasName || null, notes: notes || null });
      } else {
        await api.post('/api/pcs', { pcCode: pcCode.toUpperCase(), aliasName: aliasName || null, notes: notes || null });
      }
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
          <h2 className="text-xl font-bold text-white">{pc ? 'Edit PC' : 'Tambah PC'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
        </div>
        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!pc && (
            <div>
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Kode PC</label>
              <input type="text" value={pcCode} onChange={e => setPcCode(e.target.value)} required placeholder="Contoh: PC07"
                className="mt-2 w-full px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-mono uppercase"/>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Nama Alias (Opsional)</label>
            <input type="text" value={aliasName} onChange={e => setAliasName(e.target.value)} placeholder="Contoh: VIP 2"
              className="mt-2 w-full px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary transition-all"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Catatan (Opsional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan kondisi PC..."
              className="mt-2 w-full px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none h-20"/>
          </div>
          <button type="submit" disabled={isLoading}
            className="w-full py-3 flex items-center justify-center gap-2 rounded-xl font-medium text-white bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover disabled:opacity-60 transition-all">
            <Check className="w-4 h-4"/>
            {isLoading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </form>
      </div>
    </div>
  );
}
