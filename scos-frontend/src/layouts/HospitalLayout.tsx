import { Outlet, Link, useLocation } from 'react-router-dom';
import { Building2, LayoutDashboard, Users, Search, LogOut } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import NotificationPanel from '../components/NotificationPanel';

export default function HospitalLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard & Staff', href: '/hospital', icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-purple-400" />
              <span className="text-xl font-bold tracking-tight">LifeFile Hospital</span>
            </div>
            
            <div className="hidden md:flex relative w-64">
              <input 
                type="text" 
                placeholder="Search staff or patients..."
                className="w-full bg-slate-800 border border-slate-700 text-sm text-white rounded-full py-1.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="pt-2 text-white">
               <NotificationPanel />
            </div>
            <span className="text-sm font-medium text-slate-300 hidden sm:block">
              {user?.name || 'Hospital Admin'}
            </span>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Quick Actions & Navigation Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                    isActive 
                      ? 'bg-purple-50 text-purple-700' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Dashboard Focus Area */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
