import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import { api, ApiError } from '../../lib/api';
import { Plus, Search, Edit2, Trash2, Wallet, X, Check } from 'lucide-react';

interface Member {
  id: number;
  name: string;
  phoneNumber: string;
  status: 'active' | 'blocked';
  createdAt: string;
}

interface MemberWithSaldo extends Member {
  saldo: number;
}

const TOPUP_AMOUNTS = [50000, 100000, 200000, 500000, 1000000];

export default function MembersPage() {
  const [members, setMembers] = useState<MemberWithSaldo[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [topupTarget, setTopupTarget] = useState<MemberWithSaldo | null>(null);
  const [editTarget, setEditTarget] = useState<Member | null>(null);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<MemberWithSaldo[]>(`/api/members${search ? `?search=${search}` : ''}`);
      setMembers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchMembers, 300);
    return () => clearTimeout(t);
  }, [fetchMembers]);

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus member ini?')) return;
    try {
      await api.delete(`/api/members/${id}`);
      fetchMembers();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Gagal menghapus member.');
    }
  };

  return (
    <div className="flex min-h-screen bg-dark">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Members</h1>
            <p className="text-neutral-400">Kelola data dan saldo member</p>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover hover:to-purple-700 transition-all active:scale-[0.98] shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4"/> Tambah Member
          </button>
        </header>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500"/>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama atau nomor HP..."
            className="w-full pl-12 pr-4 py-3 bg-card border border-card-border rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary transition-all"/>
        </div>

        {/* Table */}
        <div className="glass rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Member</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">No HP</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Saldo</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-12 text-neutral-500">Memuat data...</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-neutral-500">Belum ada member.</td></tr>
              ) : (
                members.map(m => (
                  <tr key={m.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white font-medium">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-300 font-mono text-sm">{m.phoneNumber}</td>
                    <td className="px-6 py-4">
                      <span className="text-emerald-400 font-semibold">Rp {(m.saldo || 0).toLocaleString('id')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${m.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {m.status === 'active' ? 'Aktif' : 'Diblokir'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => setTopupTarget(m)} title="Top Up Saldo"
                          className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-colors">
                          <Wallet className="w-4 h-4"/>
                        </button>
                        <button onClick={() => setEditTarget(m)} title="Edit"
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors">
                          <Edit2 className="w-4 h-4"/>
                        </button>
                        <button onClick={() => handleDelete(m.id)} title="Hapus"
                          className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors">
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

      {/* Add / Edit Modal */}
      {(showAddModal || editTarget) && (
        <MemberFormModal
          member={editTarget || null}
          onClose={() => { setShowAddModal(false); setEditTarget(null); }}
          onSuccess={() => { setShowAddModal(false); setEditTarget(null); fetchMembers(); }}
        />
      )}

      {/* Top Up Modal */}
      {topupTarget && (
        <TopUpModal
          member={topupTarget}
          onClose={() => setTopupTarget(null)}
          onSuccess={() => { setTopupTarget(null); fetchMembers(); }}
        />
      )}
    </div>
  );
}

// ── Member Form Modal ──────────────────────────────────────────────────────────
function MemberFormModal({ member, onClose, onSuccess }: { member: Member | null; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState(member?.name || '');
  const [phone, setPhone] = useState(member?.phoneNumber || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      if (member) {
        await api.put(`/api/members/${member.id}`, { name, phoneNumber: phone });
      } else {
        await api.post('/api/members', { name, phoneNumber: phone });
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
          <h2 className="text-xl font-bold text-white">{member ? 'Edit Member' : 'Tambah Member'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
        </div>
        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Nama</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Nama lengkap"
              className="mt-2 w-full px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary transition-all"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">No HP</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="08xxxxxxxxxx"
              className="mt-2 w-full px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary transition-all"/>
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

// ── Top Up Modal ───────────────────────────────────────────────────────────────
function TopUpModal({ member, onClose, onSuccess }: { member: MemberWithSaldo; onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState(100000);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const finalAmount = customAmount ? parseInt(customAmount) : amount;

  const handleTopUp = async () => {
    if (!finalAmount || finalAmount < 50000) { setError('Minimum top up Rp 50.000'); return; }
    if (finalAmount > 1000000) { setError('Maksimum top up Rp 1.000.000'); return; }
    setIsLoading(true);
    setError('');
    try {
      await api.post(`/api/members/${member.id}/topup`, { amount: finalAmount, paymentMethod });
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Top Up Saldo</h2>
            <p className="text-sm text-neutral-400">{member.name} · Saldo: <span className="text-emerald-400">Rp {(member.saldo || 0).toLocaleString('id')}</span></p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
        </div>
        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Nominal</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {TOPUP_AMOUNTS.map(a => (
                <button key={a} type="button" onClick={() => { setAmount(a); setCustomAmount(''); }}
                  className={`py-2 rounded-xl text-sm font-semibold border transition-all ${amount === a && !customAmount ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10'}`}>
                  {(a/1000)}K
                </button>
              ))}
            </div>
            <input type="number" value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder="Nominal lainnya..."
              className="mt-2 w-full px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary transition-all"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Metode Bayar</label>
            <div className="flex gap-2 mt-2">
              {['cash', 'qris', 'transfer'].map(m => (
                <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border capitalize transition-all ${paymentMethod === m ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center">
            <span className="text-neutral-400 text-sm">Jumlah Top Up</span>
            <span className="text-emerald-400 font-bold text-lg">Rp {(finalAmount || 0).toLocaleString('id')}</span>
          </div>
          <button onClick={handleTopUp} disabled={isLoading}
            className="w-full py-3 flex items-center justify-center gap-2 rounded-xl font-medium text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 disabled:opacity-60 transition-all active:scale-[0.98]">
            <Wallet className="w-4 h-4"/>
            {isLoading ? 'Memproses...' : `Top Up Rp ${(finalAmount || 0).toLocaleString('id')}`}
          </button>
        </div>
      </div>
    </div>
  );
}
