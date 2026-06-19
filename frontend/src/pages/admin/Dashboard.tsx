import { useEffect, useState, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import PcCard from '../../components/PcCard';
import { Activity, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import StartSessionModal from '../../components/modals/StartSessionModal';
import AddTimeModal from '../../components/modals/AddTimeModal';
import EndSessionModal from '../../components/modals/EndSessionModal';
import TransferModal from '../../components/modals/TransferModal';

interface SessionInfo {
  id: number;
  endTime: string;
  memberId: number | null;
  guestName: string | null;
}

interface PC {
  id: number;
  pcCode: string;
  aliasName: string | null;
  status: 'available' | 'active' | 'maintenance';
  session?: SessionInfo;
}

interface ActiveSessionRaw {
  id: number;
  pcId: number;
  memberId: number | null;
  guestName: string | null;
  endTime: string;
  status: string;
}

// Modal state
type ModalState =
  | { type: 'start'; pc: PC }
  | { type: 'add_time'; pc: PC }
  | { type: 'end'; pc: PC }
  | { type: 'transfer'; pc: PC }
  | null;

export default function AdminDashboard() {
  const [pcs, setPcs] = useState<PC[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);

  const fetchPcs = useCallback(async () => {
    try {
      const [pcList, activeSessions] = await Promise.all([
        api.get<PC[]>('/api/pcs'),
        api.get<ActiveSessionRaw[]>('/api/sessions/active'),
      ]);

      // Merge sessions into PCs
      const sessionByPcId = new Map(activeSessions.map(s => [s.pcId, s]));

      const merged = pcList.map((pc): PC => {
        const session = sessionByPcId.get(pc.id);
        return {
          ...pc,
          session: session ? {
            id: session.id,
            endTime: session.endTime,
            memberId: session.memberId,
            guestName: session.guestName,
          } : undefined,
        };
      });

      setPcs(merged);
    } catch (err) {
      console.error('Failed to fetch PCs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPcs(); }, [fetchPcs]);

  // TODO: Re-enable when WebSocket is stable
  // useWebSocket('ws://localhost:3001/ws', ...);

  const handlePcAction = (action: string, pcId: number) => {
    const pc = pcs.find(p => p.id === pcId);
    if (!pc) return;
    if (action === 'start') setModal({ type: 'start', pc });
    else if (action === 'add_time') setModal({ type: 'add_time', pc });
    else if (action === 'end') setModal({ type: 'end', pc });
    else if (action === 'transfer') setModal({ type: 'transfer', pc });
  };

  const handleModalSuccess = () => {
    setModal(null);
    fetchPcs(); // Refresh data after action
  };

  const activeCount = pcs.filter(p => p.status === 'active').length;

  return (
    <div className="flex min-h-screen bg-dark">
      <Sidebar />

      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Live Monitoring</h1>
            <p className="text-neutral-400">Real-time overview of all stations</p>
          </div>

          <div className="flex gap-4 items-center">
            <button onClick={fetchPcs} title="Refresh" className="p-3 rounded-xl glass hover:bg-white/10 text-neutral-400 hover:text-white transition-colors">
              <RefreshCw className="w-5 h-5"/>
            </button>

            <div className="glass px-6 py-4 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-primary"/>
              </div>
              <div>
                <p className="text-sm text-neutral-400 font-medium">Sesi Aktif</p>
                <p className="text-2xl font-bold text-white">{activeCount} / {pcs.length}</p>
              </div>
            </div>

            <div className="glass px-6 py-4 rounded-2xl flex flex-col justify-center">
              <p className="text-sm text-neutral-400 font-medium mb-1">System Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"/>
                <span className="font-semibold text-emerald-400">Online</span>
              </div>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <svg className="animate-spin h-10 w-10 text-primary" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <p className="text-neutral-400">Memuat data PC...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {pcs.length === 0 ? (
              <div className="col-span-full text-center py-20 text-neutral-500">
                <p className="text-lg">Belum ada PC terdaftar.</p>
                <p className="text-sm mt-2">Tambahkan PC di menu "Manage PCs".</p>
              </div>
            ) : (
              pcs.map((pc) => (
                <PcCard
                  key={pc.id}
                  id={pc.id}
                  code={pc.pcCode}
                  alias={pc.aliasName}
                  status={pc.status}
                  session={pc.session ? {
                    endTime: pc.session.endTime,
                    memberType: pc.session.memberId ? 'member' : 'guest',
                    name: pc.session.guestName || `Member #${pc.session.memberId}`,
                  } : undefined}
                  onAction={handlePcAction}
                />
              ))
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {modal?.type === 'start' && (
        <StartSessionModal
          pcId={modal.pc.id}
          pcCode={modal.pc.pcCode}
          onClose={() => setModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}
      {modal?.type === 'add_time' && modal.pc.session && (
        <AddTimeModal
          sessionId={modal.pc.session.id}
          pcCode={modal.pc.pcCode}
          isMember={!!modal.pc.session.memberId}
          onClose={() => setModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}
      {modal?.type === 'end' && modal.pc.session && (
        <EndSessionModal
          sessionId={modal.pc.session.id}
          pcCode={modal.pc.pcCode}
          onClose={() => setModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}
      {modal?.type === 'transfer' && modal.pc.session && (
        <TransferModal
          sessionId={modal.pc.session.id}
          currentPcCode={modal.pc.pcCode}
          onClose={() => setModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
