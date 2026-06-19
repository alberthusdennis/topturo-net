import { useEffect, useState, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import { Tag, Plus, Pencil, Trash2, Moon, Clock, X, Check, AlertTriangle } from 'lucide-react';
import { api, ApiError } from '../../lib/api';

interface Price {
  id: number;
  packageName: string;
  durationMinutes: number;
  priceMember: string;
  priceNonMember: string;
  isNightPackage: boolean;
}

const emptyForm = {
  packageName: '',
  durationMinutes: 60,
  priceMember: 0,
  priceNonMember: 0,
  isNightPackage: false,
};

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} menit`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} jam ${m} menit` : `${h} jam`;
}

export default function Prices() {
  const [prices, setPrices]     = useState<Price[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [showModal, setModal]   = useState(false);
  const [editing, setEditing]   = useState<Price | null>(null);
  const [form, setForm]         = useState({ ...emptyForm });
  const [isSaving, setSaving]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Price | null>(null);
  const [isDeleting, setDeleting] = useState(false);
  const [error, setError]       = useState('');

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Price[]>('/api/prices');
      setPrices(data);
    } catch (err) {
      console.error('Failed to fetch prices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrices(); }, [fetchPrices]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setError('');
    setModal(true);
  };

  const openEdit = (p: Price) => {
    setEditing(p);
    setForm({
      packageName: p.packageName,
      durationMinutes: p.durationMinutes,
      priceMember: Number(p.priceMember),
      priceNonMember: Number(p.priceNonMember),
      isNightPackage: p.isNightPackage,
    });
    setError('');
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setEditing(null);
    setError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.packageName.trim()) { setError('Nama paket tidak boleh kosong.'); return; }
    if (form.durationMinutes < 1)  { setError('Durasi minimal 1 menit.'); return; }
    if (form.priceMember < 0 || form.priceNonMember < 0) { setError('Harga tidak boleh negatif.'); return; }

    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api.put(`/api/prices/${editing.id}`, form);
      } else {
        await api.post('/api/prices', form);
      }
      await fetchPrices();
      closeModal();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Gagal menyimpan data.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/prices/${deleteTarget.id}`);
      await fetchPrices();
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-dark">
      <Sidebar />

      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <header className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Kelola Harga</h1>
            <p className="text-neutral-400">Atur paket tarif bermain untuk member dan non-member</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4"/> Tambah Paket
          </button>
        </header>

        {/* Table */}
        <section className="glass rounded-2xl border border-white/5 overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse"/>)}
            </div>
          ) : prices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                <Tag className="w-7 h-7 text-neutral-500"/>
              </div>
              <p className="text-neutral-500">Belum ada paket harga.</p>
              <button onClick={openAdd} className="text-primary hover:underline text-sm">+ Tambah paket pertama</button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="px-6 py-4 text-xs text-neutral-500 uppercase tracking-wider font-semibold">Nama Paket</th>
                  <th className="px-6 py-4 text-xs text-neutral-500 uppercase tracking-wider font-semibold">Durasi</th>
                  <th className="px-6 py-4 text-xs text-neutral-500 uppercase tracking-wider font-semibold">Harga Member</th>
                  <th className="px-6 py-4 text-xs text-neutral-500 uppercase tracking-wider font-semibold">Harga Non-Member</th>
                  <th className="px-6 py-4 text-xs text-neutral-500 uppercase tracking-wider font-semibold">Tipe</th>
                  <th className="px-6 py-4 text-xs text-neutral-500 uppercase tracking-wider font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {prices.map(p => (
                  <tr key={p.id} className="hover:bg-white/3 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${p.isNightPackage ? 'bg-indigo-500/20' : 'bg-emerald-500/20'}`}>
                          {p.isNightPackage
                            ? <Moon className="w-4 h-4 text-indigo-400"/>
                            : <Tag className="w-4 h-4 text-emerald-400"/>
                          }
                        </div>
                        <span className="font-semibold text-white">{p.packageName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-neutral-300">
                        <Clock className="w-3.5 h-3.5 text-neutral-500"/>
                        {formatDuration(p.durationMinutes)}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-emerald-400 font-medium">
                      Rp {Number(p.priceMember).toLocaleString('id')}
                    </td>
                    <td className="px-6 py-4 font-mono text-amber-400 font-medium">
                      Rp {Number(p.priceNonMember).toLocaleString('id')}
                    </td>
                    <td className="px-6 py-4">
                      {p.isNightPackage ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/20">
                          🌙 Malam (22:00–05:00)
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          ☀️ Reguler
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(p)}
                          title="Edit"
                          className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <Pencil className="w-4 h-4"/>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          title="Hapus"
                          className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal}/>
          <div className="relative w-full max-w-md glass rounded-2xl border border-white/10 shadow-2xl p-6 z-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                {editing ? 'Edit Paket Harga' : 'Tambah Paket Harga'}
              </h2>
              <button onClick={closeModal} className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-all">
                <X className="w-5 h-5"/>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Package Name */}
              <div>
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">Nama Paket</label>
                <input
                  type="text"
                  placeholder="misal: Paket 1 Jam, Paket Malam"
                  value={form.packageName}
                  onChange={e => setForm(f => ({ ...f, packageName: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  required
                />
              </div>

              {/* Duration */}
              <div>
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">
                  Durasi (menit) <span className="text-neutral-600 normal-case font-normal">— 60 = 1 jam, 120 = 2 jam</span>
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.durationMinutes}
                  onChange={e => setForm(f => ({ ...f, durationMinutes: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  required
                />
                {form.durationMinutes > 0 && (
                  <p className="text-xs text-neutral-500 mt-1">= {formatDuration(form.durationMinutes)}</p>
                )}
              </div>

              {/* Prices in 2 columns */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">Harga Member (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={form.priceMember}
                    onChange={e => setForm(f => ({ ...f, priceMember: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">Harga Non-Member (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={form.priceNonMember}
                    onChange={e => setForm(f => ({ ...f, priceNonMember: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    required
                  />
                </div>
              </div>

              {/* Night Package Toggle */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-black/30 border border-white/5">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, isNightPackage: !f.isNightPackage }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.isNightPackage ? 'bg-indigo-500' : 'bg-white/10'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.isNightPackage ? 'translate-x-5' : 'translate-x-0'}`}/>
                </button>
                <div>
                  <p className="text-sm font-medium text-white">Paket Malam</p>
                  <p className="text-xs text-neutral-500">Hanya bisa dipilih antara jam 22:00 – 05:00</p>
                </div>
                {form.isNightPackage && <Moon className="w-4 h-4 text-indigo-400 ml-auto"/>}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 py-2.5 rounded-xl font-medium text-neutral-400 glass hover:bg-white/10 transition-all">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : <Check className="w-4 h-4"/>}
                  {editing ? 'Simpan Perubahan' : 'Tambah Paket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}/>
          <div className="relative w-full max-w-sm glass rounded-2xl border border-white/10 shadow-2xl p-6 z-10 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400"/>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Hapus Paket Harga?</h3>
            <p className="text-neutral-400 text-sm mb-6">
              Paket <strong className="text-white">"{deleteTarget.packageName}"</strong> akan dihapus permanen dari daftar. Transaksi yang sudah ada tidak terpengaruh.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl font-medium text-neutral-400 glass hover:bg-white/10 transition-all">
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-60"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
