import { Outlet, Link, useLocation } from 'react-router-dom';
import { Activity, Calendar, Clock, Settings, LogOut, User, Building2, BrainCircuit, HeartPulse, BarChart3 } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import NotificationPanel from '../components/NotificationPanel';
import PatientAIAssistant from '../components/PatientAIAssistant';

export default function PatientLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/patient', icon: Activity },
    { name: 'AI Risk Predictor', href: '/patient/ai-predictor', icon: HeartPulse },
    { name: 'AI Symptom Triage', href: '/patient/ai-triage', icon: BrainCircuit },
    { name: 'Hospitals', href: '/patient/hospitals', icon: Building2 },
    { name: 'My Appointments', href: '/patient/appointments', icon: Calendar },
    { name: 'Medical Timeline', href: '/patient/timeline', icon: Clock },
    { name: 'Health Analytics', href: '/patient/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/patient/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 hidden md:flex md:flex-col fixed inset-y-0 z-10">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-800">Patient Portal</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
          <h1 className="text-xl font-semibold text-slate-800 hidden sm:block">
            {navigation.find(n => n.href === location.pathname)?.name || 'Dashboard'}
          </h1>
          
          <div className="flex items-center gap-4 ml-auto">
            {/* Notification Bell */}
            <NotificationPanel />
            
            {/* User Profile */}
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-700">{user?.name || 'Patient User'}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                <User className="w-5 h-5" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pb-20 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-between px-2 py-2 z-40">
        {[
          { name: 'Dashboard', href: '/patient', icon: Activity },
          { name: 'Appointments', href: '/patient/appointments', icon: Calendar },
          { name: 'Timeline', href: '/patient/timeline', icon: Clock },
          { name: 'Settings', href: '/patient/settings', icon: Settings }
        ].map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center justify-center w-full p-2 rounded-lg transition-colors ${
                isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <item.icon className={`w-5 h-5 mb-1 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <PatientAIAssistant />
    </div>
  );
}
