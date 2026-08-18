import { Outlet, Link, useLocation } from 'react-router-dom';
import { Shield, Users, ActivitySquare, Settings, LogOut, Building2, Hospital, BarChart3 } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navigation = [
    { name: 'System Overview', href: '/admin', icon: ActivitySquare },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'Manage Doctors', href: '/admin/doctors', icon: Users },
    { name: 'Manage Clinics', href: '/admin/clinics', icon: Building2 },
    { name: 'Manage Hospitals', href: '/admin/hospitals', icon: Hospital },
    { name: 'Audit Logs', href: '/admin/audit', icon: Shield },
    { name: 'Configuration', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Dense Sidebar for Deep System Controls */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed inset-y-0 z-10">
        <div className="p-6 flex items-center gap-3 bg-slate-950">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">LifeFile Admin</span>
        </div>
        
        <div className="px-6 py-4 border-b border-slate-800">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Signed in as</p>
          <p className="text-sm font-medium text-slate-200">{user?.name || 'Administrator'}</p>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? 'text-indigo-200' : 'text-slate-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 bg-slate-950">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center px-6 sticky top-0 z-20">
          <h1 className="text-xl font-semibold text-slate-800">
            {navigation.find(n => n.href === location.pathname)?.name || 'Admin Console'}
          </h1>
        </header>

        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
