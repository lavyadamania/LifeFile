import { Outlet, Link } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

export default function BaseLayout() {
  const { role, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo area */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-800 tracking-tight">LifeFile</span>
            </div>

            {/* Nav actions */}
            <div className="flex items-center gap-4">
              <nav className="hidden md:flex gap-6">
                <Link to="/patient" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Patient</Link>
                <Link to="/doctor" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Doctor</Link>
                <Link to="/admin" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Admin</Link>
              </nav>
              
              <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>
              
              {role ? (
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full capitalize">
                    {role}
                  </span>
                  <button onClick={logout} className="text-sm font-medium text-red-600 hover:text-red-700">Logout</button>
                </div>
              ) : (
                <div className="text-sm text-slate-500 italic">Not logged in</div>
              )}
            </div>
            
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 min-h-[60vh] overflow-hidden">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-slate-500 font-medium">
            &copy; {new Date().getFullYear()} LifeFile. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
