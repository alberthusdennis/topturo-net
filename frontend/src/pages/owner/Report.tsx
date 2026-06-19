import Sidebar from '../../components/Sidebar';
import { Receipt, TableProperties, Calendar, RefreshCw } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';

interface ShiftData {
  startDate: string;
  endDate: string;
  byMethod: { paymentMethod: string; total: number; count: number }[];
  grandTotal: number;
  totalSessions: number;
}

interface TrxRow {
  id: number;
  trxNumber: string;
  type: string;
  paymentMethod: string;
  totalAmount: number;
  createdAt: string;
  pcCode: string | null;
  customerName: string;
  durationMinutes: number | null;
  operator: string | null;
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer', saldo: 'Saldo Member',
};

const TYPE_LABELS: Record<string, string> = {
  session: 'Mulai Sesi', add_time: 'Tambah Waktu', top_up: 'Top Up',
};

const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

export default function OwnerReport() {
  const today = toDateInput(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate]     = useState(today);
  const [shiftData, setShiftData] = useState<ShiftData | null>(null);
  const [trxRows, setTrxRows]     = useState<TrxRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'transactions'>('summary');

  const fetchReport = useCallback(async (sd = startDate, ed = endDate) => {
    setIsLoading(true);
    try {
      const params = `?startDate=${sd}&endDate=${ed}`;
      const [shift, trx] = await Promise.all([
        api.get<ShiftData>(`/api/reports/shift${params}`),
        api.get<TrxRow[]>(`/api/reports/transactions${params}`),
      ]);
      setShiftData(shift);
      setTrxRows(trx);
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchReport(); }, []);

  const isFiltered = startDate !== today || endDate !== today;

  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="flex min-h-screen bg-dark">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Laporan Keuangan</h1>
            <p className="text-neutral-400">Ringkasan pendapatan per periode</p>
          </div>
          <button
            onClick={() => fetchReport(startDate, endDate)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-400 glass hover:bg-white/10 transition-all"
          >
            <RefreshCw className="w-4 h-4"/> Refresh
          </button>
        </header>

        {/* Date Filter */}
        <section className="glass rounded-2xl border border-white/5 p-5 mb-8">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-neutral-400 text-sm font-medium mr-2">
              <Calendar className="w-4 h-4"/>
              <span>Filter Tanggal</span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Dari</label>
              <input type="date" value={startDate} max={endDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Sampai</label>
              <input type="date" value={endDate} min={startDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
            <button
              onClick={() => fetchReport(startDate, endDate)}
              className="px-6 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 transition-all"
            >
              Terapkan
            </button>
            {isFiltered && (
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium border border-amber-500/30">
                Filter aktif
              </span>
            )}
          </div>
        </section>

        {/* Stat Cards */}
        {shiftData && !isLoading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="glass rounded-2xl border border-white/5 p-5">
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Total Pendapatan</p>
              <p className="text-2xl font-bold text-emerald-400">Rp {shiftData.grandTotal.toLocaleString('id')}</p>
            </div>
            <div className="glass rounded-2xl border border-white/5 p-5">
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Total Transaksi</p>
              <p className="text-2xl font-bold text-white">{shiftData.totalSessions}</p>
            </div>
            <div className="glass rounded-2xl border border-white/5 p-5">
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Tunai / QRIS / Transfer</p>
              <p className="text-2xl font-bold text-white">
                Rp {shiftData.byMethod.filter(m => m.paymentMethod !== 'saldo').reduce((a, b) => a + b.total, 0).toLocaleString('id')}
              </p>
            </div>
            <div className="glass rounded-2xl border border-white/5 p-5">
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Saldo Member</p>
              <p className="text-2xl font-bold text-white">
                Rp {(shiftData.byMethod.find(m => m.paymentMethod === 'saldo')?.total ?? 0).toLocaleString('id')}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'summary',      label: 'Rekap Kasir',       icon: Receipt },
            { key: 'transactions', label: 'Riwayat Transaksi', icon: TableProperties },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                activeTab === tab.key
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'text-neutral-400 glass border-white/5 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4"/> {tab.label}
            </button>
          ))}
        </div>

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <section className="glass rounded-2xl border border-white/5 p-6">
            {isLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse"/>)}</div>
            ) : shiftData && shiftData.byMethod.length > 0 ? (
              <div className="space-y-3">
                {shiftData.byMethod.map(item => (
                  <div key={item.paymentMethod} className="flex justify-between items-center p-4 rounded-xl bg-black/40 border border-white/5">
                    <div>
                      <span className="text-neutral-300 font-medium">{METHOD_LABELS[item.paymentMethod] || item.paymentMethod}</span>
                      <span className="ml-2 text-xs text-neutral-500">({item.count} transaksi)</span>
                    </div>
                    <span className="text-xl font-bold text-white">Rp {item.total.toLocaleString('id')}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center p-4 rounded-xl bg-primary/10 border border-primary/20 mt-4">
                  <span className="text-primary font-semibold">Grand Total ({shiftData.totalSessions} transaksi)</span>
                  <span className="text-2xl font-bold text-primary">Rp {shiftData.grandTotal.toLocaleString('id')}</span>
                </div>
              </div>
            ) : (
              <p className="text-neutral-500 text-center py-12">Tidak ada transaksi pada periode ini.</p>
            )}
          </section>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <section className="glass rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Riwayat Transaksi</h2>
              <span className="ml-auto text-sm text-neutral-500">{trxRows.length} transaksi</span>
            </div>
            {isLoading ? (
              <div className="p-6 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse"/>)}</div>
            ) : trxRows.length === 0 ? (
              <p className="text-neutral-500 text-center py-12">Tidak ada transaksi pada periode ini.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left">
                      <th className="px-6 py-3 text-xs text-neutral-500 uppercase tracking-wider font-semibold">Waktu</th>
                      <th className="px-6 py-3 text-xs text-neutral-500 uppercase tracking-wider font-semibold">PC</th>
                      <th className="px-6 py-3 text-xs text-neutral-500 uppercase tracking-wider font-semibold">Pelanggan</th>
                      <th className="px-6 py-3 text-xs text-neutral-500 uppercase tracking-wider font-semibold">Jenis</th>
                      <th className="px-6 py-3 text-xs text-neutral-500 uppercase tracking-wider font-semibold">Metode</th>
                      <th className="px-6 py-3 text-xs text-neutral-500 uppercase tracking-wider font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {trxRows.map(row => (
                      <tr key={row.id} className="hover:bg-white/3 transition-colors">
                        <td className="px-6 py-3 text-neutral-400 font-mono text-xs whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                        <td className="px-6 py-3 text-white font-semibold">{row.pcCode || '-'}</td>
                        <td className="px-6 py-3 text-neutral-300">{row.customerName}</td>
                        <td className="px-6 py-3">
                          <span className="px-2 py-1 rounded-md bg-white/5 text-neutral-400 text-xs">{TYPE_LABELS[row.type] || row.type}</span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                            row.paymentMethod === 'cash' ? 'bg-emerald-500/10 text-emerald-400' :
                            row.paymentMethod === 'qris' ? 'bg-blue-500/10 text-blue-400' :
                            row.paymentMethod === 'transfer' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-purple-500/10 text-purple-400'
                          }`}>
                            {METHOD_LABELS[row.paymentMethod] || row.paymentMethod}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right font-bold text-white">Rp {row.totalAmount.toLocaleString('id')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
