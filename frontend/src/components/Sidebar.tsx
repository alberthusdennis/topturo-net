import { MonitorPlay, Users, LayoutDashboard, Receipt, LogOut, Tag, BarChart3 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const ADMIN_MENU = [
  { icon: LayoutDashboard, label: 'Dashboard',     path: '/admin/dashboard' },
  { icon: MonitorPlay,     label: 'Kelola PC',      path: '/admin/pcs' },
  { icon: Users,           label: 'Member',          path: '/admin/members' },
  { icon: Tag,             label: 'Kelola Harga',   path: '/admin/prices' },
  { icon: Receipt,         label: 'Laporan Shift',  path: '/admin/report' },
];

const OWNER_MENU = [
  { icon: BarChart3, label: 'Dashboard Owner', path: '/owner/dashboard' },
  { icon: Receipt,   label: 'Laporan Keuangan', path: '/owner/report' },
];

export default function Sidebar() {
  const { logout, user } = useAuthStore();
  const isOwner = user?.role === 'owner';
  const menuItems = isOwner ? OWNER_MENU : ADMIN_MENU;

  return (
    <aside className="w-64 h-screen bg-card border-r border-card-border flex flex-col fixed left-0 top-0 z-20">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-card-border">
        <img src="/topturo.jpg" className="w-8 h-8 rounded-lg object-cover" alt="Logo" />
        <div>
          <h2 className="font-bold text-white tracking-tight leading-tight">El Matadore</h2>
          <p className="text-xs text-neutral-400">
            {isOwner ? 'Owner Portal' : 'Admin Panel'}
          </p>
        </div>
      </div>

      {/* Role Badge */}
      <div className="px-4 pt-4">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border ${
          isOwner
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            : 'bg-primary/10 text-primary border-primary/20'
        }`}>
          <div className={`w-2 h-2 rounded-full ${isOwner ? 'bg-amber-400' : 'bg-primary'} animate-pulse`}/>
          {user?.username}
          <span className="ml-auto uppercase tracking-wider text-[10px] opacity-70">
            {isOwner ? 'Owner' : 'Admin'}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
              ${isActive
                ? 'bg-primary/10 text-primary font-medium border border-primary/20'
                : 'text-neutral-400 hover:bg-white/5 hover:text-white border border-transparent'}
            `}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-card-border">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all border border-transparent hover:border-red-500/20"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
