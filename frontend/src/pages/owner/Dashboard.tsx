import { useEffect, useState } from 'react';
import { BarChart3, Users, MonitorPlay, TrendingUp, RefreshCw } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import { api } from '../../lib/api';

interface ShiftData {
  grandTotal: number;
  totalSessions: number;
  byMethod: { paymentMethod: string; total: number; count: number }[];
}

interface Pc {
  id: number;
  status: string;
}

const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

export default function OwnerDashboard() {
  const today = toDateInput(new Date());
  const [shiftData, setShiftData]     = useState<ShiftData | null>(null);
  const [activePcs, setActivePcs]     = useState(0);
  const [totalPcs, setTotalPcs]       = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [isLoading, setIsLoading]     = useState(true);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [shift, pcsData, membersData] = await Promise.all([
        api.get<ShiftData>(`/api/reports/shift?startDate=${today}&endDate=${today}`),
        api.get<Pc[]>('/api/pcs'),
        api.get<any[]>('/api/members'),
      ]);
      setShiftData(shift);
      setTotalPcs(pcsData.length);
      setActivePcs(pcsData.filter(p => p.status === 'active').length);
      setTotalMembers(membersData.length);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const METHOD_LABELS: Record<string, string> = {
    cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer', saldo: 'Saldo Member',
  };

  const utilPct = totalPcs > 0 ? Math.round((activePcs / totalPcs) * 100) : 0;

  return (
    <div className="flex min-h-screen bg-dark">
      <Sidebar />

      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <header className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Owner Dashboard</h1>
            <p className="text-neutral-400">Ringkasan finansial &amp; operasional hari ini · {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-400 glass hover:bg-white/10 transition-all"
          >
            <RefreshCw className="w-4 h-4"/> Refresh
          </button>
        </header>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Revenue */}
          <div className="glass p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"/>
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <BarChart3 className="w-6 h-6 text-emerald-400"/>
              </div>
              <h3 className="text-neutral-400 font-medium">Pendapatan Hari Ini</h3>
            </div>
            {isLoading ? (
              <div className="h-9 w-40 rounded-lg bg-white/5 animate-pulse"/>
            ) : (
              <p className="text-3xl font-bold text-white relative z-10">
                Rp {(shiftData?.grandTotal ?? 0).toLocaleString('id')}
              </p>
            )}
            <p className="text-sm text-emerald-400 mt-2 relative z-10">
              {shiftData?.totalSessions ?? 0} transaksi
            </p>
          </div>

          {/* Members */}
          <div className="glass p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all"/>
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="p-3 rounded-xl bg-primary/20">
                <Users className="w-6 h-6 text-primary"/>
              </div>
              <h3 className="text-neutral-400 font-medium">Total Member</h3>
            </div>
            {isLoading ? (
              <div className="h-9 w-20 rounded-lg bg-white/5 animate-pulse"/>
            ) : (
              <p className="text-3xl font-bold text-white relative z-10">{totalMembers}</p>
            )}
            <p className="text-sm text-primary mt-2 relative z-10">Member aktif</p>
          </div>

          {/* Active PCs */}
          <div className="glass p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all"/>
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="p-3 rounded-xl bg-amber-500/20">
                <MonitorPlay className="w-6 h-6 text-amber-400"/>
              </div>
              <h3 className="text-neutral-400 font-medium">PC Aktif</h3>
            </div>
            {isLoading ? (
              <div className="h-9 w-24 rounded-lg bg-white/5 animate-pulse"/>
            ) : (
              <p className="text-3xl font-bold text-white relative z-10">{activePcs} / {totalPcs}</p>
            )}
            <p className="text-sm text-amber-400 mt-2 relative z-10">{utilPct}% utilisasi</p>
          </div>
        </div>

        {/* Breakdown by payment method */}
        <section className="glass rounded-2xl border border-white/5 p-6">
          <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <TrendingUp className="w-5 h-5 text-emerald-400"/>
            </div>
            <h2 className="text-xl font-bold text-white">Pendapatan per Metode Pembayaran</h2>
            <span className="ml-auto text-xs text-neutral-500">Hari ini</span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse"/>)}
            </div>
          ) : !shiftData || shiftData.byMethod.length === 0 ? (
            <p className="text-neutral-500 text-center py-8">Belum ada transaksi hari ini.</p>
          ) : (
            <div className="space-y-3">
              {shiftData.byMethod.map(m => (
                <div key={m.paymentMethod} className="flex justify-between items-center p-4 rounded-xl bg-black/40 border border-white/5">
                  <div>
                    <span className="text-neutral-300 font-medium">{METHOD_LABELS[m.paymentMethod] || m.paymentMethod}</span>
                    <span className="ml-2 text-xs text-neutral-500">({m.count} transaksi)</span>
                  </div>
                  <span className="text-xl font-bold text-white">Rp {m.total.toLocaleString('id')}</span>
                </div>
              ))}
              <div className="flex justify-between items-center p-4 rounded-xl bg-primary/10 border border-primary/20 mt-4">
                <span className="text-primary font-semibold">Total</span>
                <span className="text-2xl font-bold text-primary">Rp {shiftData.grandTotal.toLocaleString('id')}</span>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
