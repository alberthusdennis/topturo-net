import { Monitor, Clock, Play, Plus, PowerOff, ArrowRightLeft } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PcProps {
  id: number;
  code: string;
  alias: string | null;
  status: 'available' | 'active' | 'maintenance';
  session?: {
    endTime: string;
    memberType: 'member' | 'guest';
    name: string;
  };
  onAction: (action: string, pcId: number) => void;
}

export default function PcCard({ id, code, alias, status, session, onAction }: PcProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (status !== 'active' || !session?.endTime) return;

    const end = new Date(session.endTime).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('00:00:00');
        setIsUrgent(true);
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      
      // Less than 15 minutes
      if (diff < 15 * 60 * 1000) {
        setIsUrgent(true);
      } else {
        setIsUrgent(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [status, session]);

  const statusConfig = {
    available: { color: 'bg-emerald-500', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20' },
    active: { 
      color: isUrgent ? 'bg-amber-500 animate-pulse' : 'bg-primary', 
      border: isUrgent ? 'border-amber-500/50' : 'border-primary/30',
      glow: isUrgent ? 'shadow-amber-500/30' : 'shadow-primary/20'
    },
    maintenance: { color: 'bg-rose-500', border: 'border-rose-500/30', glow: 'shadow-rose-500/20' },
  };

  const cfg = statusConfig[status];

  return (
    <div className={`relative overflow-hidden rounded-2xl glass border ${cfg.border} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${cfg.glow}`}>
      
      {/* Status indicator pill */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${cfg.color}`}></div>
        <span className="text-xs font-medium text-neutral-300 uppercase tracking-wider">{status}</span>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-4 mb-6">
          <div className={`p-3 rounded-xl bg-black/40 border border-white/5`}>
            <Monitor className={`w-8 h-8 ${status === 'active' ? (isUrgent ? 'text-amber-400' : 'text-primary') : 'text-neutral-400'}`} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight">{alias || code}</h3>
            {alias && <p className="text-xs text-neutral-500">{code}</p>}
          </div>
        </div>

        {status === 'active' ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-black/30 p-3 rounded-lg border border-white/5">
              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 ${isUrgent ? 'text-amber-400' : 'text-primary'}`} />
                <span className={`font-mono text-lg font-semibold tracking-wider ${isUrgent ? 'text-amber-400' : 'text-white'}`}>
                  {timeLeft}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-neutral-400">{session?.memberType === 'member' ? 'Member' : 'Guest'}</p>
                <p className="text-sm font-medium text-white truncate max-w-[100px]">{session?.name}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => onAction('add_time', id)} className="flex flex-col items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group">
                <Plus className="w-4 h-4 text-neutral-400 group-hover:text-white mb-1" />
                <span className="text-[10px] uppercase font-semibold text-neutral-400 group-hover:text-white">Add</span>
              </button>
              <button onClick={() => onAction('transfer', id)} className="flex flex-col items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group">
                <ArrowRightLeft className="w-4 h-4 text-neutral-400 group-hover:text-white mb-1" />
                <span className="text-[10px] uppercase font-semibold text-neutral-400 group-hover:text-white">Move</span>
              </button>
              <button onClick={() => onAction('end', id)} className="flex flex-col items-center justify-center p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors group">
                <PowerOff className="w-4 h-4 text-rose-400 group-hover:text-rose-300 mb-1" />
                <span className="text-[10px] uppercase font-semibold text-rose-400 group-hover:text-rose-300">End</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[120px] bg-black/20 rounded-xl border border-white/5 border-dashed">
            {status === 'available' ? (
              <button 
                onClick={() => onAction('start', id)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 border border-emerald-500/20 font-medium transition-all active:scale-95"
              >
                <Play className="w-4 h-4" />
                <span>Start Session</span>
              </button>
            ) : (
              <p className="text-sm font-medium text-rose-400 flex items-center gap-2">
                Under Maintenance
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
