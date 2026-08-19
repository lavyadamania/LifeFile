import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileText, Calendar, PlusCircle, Search, LogOut, Stethoscope, UserCircle, Building, BarChart3 } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import useDoctorStore from '../store/useDoctorStore';
import useStreamingStore from '../services/streaming';
import { getDoctorProfile } from '../lib/api';
import NotificationPanel from '../components/NotificationPanel';

export default function DoctorLayout() {
  const { user, logout } = useAuthStore();
  const { disconnect } = useStreamingStore();
  const { activeHospitalId, setActiveHospitalId, hospitals, setHospitals } = useDoctorStore();

  const handleLogout = () => {
    disconnect();
    logout();
  };
  const location = useLocation();

  useEffect(() => {
    getDoctorProfile().then(res => {
      if (res.data && res.data.hospitals) {
        setHospitals(res.data.hospitals);
      }
    }).catch(() => {});
  }, [setHospitals]);

  const navigation = [
    { name: 'Dashboard', href: '/doctor', icon: LayoutDashboard },
    { name: 'Analytics', href: '/doctor/analytics', icon: BarChart3 },
    { name: 'Active Queue', href: '/doctor/queue', icon: Users },
    { name: 'My Schedule', href: '/doctor/schedule', icon: Calendar },
    { name: 'Medical Records', href: '/doctor/records', icon: FileText },
    { name: 'My Profile', href: '/doctor/profile', icon: UserCircle },
    { name: 'Hospitals', href: '/doctor/hospitals', icon: Building },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navbar Optimized for Clinical Workflow */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-blue-400" />
              <span className="text-xl font-bold tracking-tight">SCOS Clinical</span>
            </div>
            
            {/* Contextual Search */}
            <div className="hidden md:flex relative w-64">
              <input 
                type="text" 
                placeholder="Search patient by ID or name..."
                className="w-full bg-slate-800 border border-slate-700 text-sm text-white rounded-full py-1.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Context Switcher - Now visible on mobile */}
            <div className="flex items-center gap-1 sm:gap-2 bg-slate-800 rounded-lg px-2 sm:px-3 py-1.5 border border-slate-700">
              <Building className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
              <select
                value={activeHospitalId}
                onChange={(e) => setActiveHospitalId(e.target.value)}
                className="bg-transparent text-xs sm:text-sm text-white focus:outline-none appearance-none cursor-pointer pr-2 sm:pr-4 max-w-[100px] sm:max-w-none truncate"
              >
                <option value="all" className="text-slate-900">All Facilities</option>
                <option value="private" className="text-slate-900">My Private Clinic</option>
                {hospitals.map(h => (
                  <option key={h._id} value={h._id} className="text-slate-900">{h.name}</option>
                ))}
              </select>
            </div>
            <div className="pt-2 text-white">
               <NotificationPanel />
            </div>
            <span className="text-sm font-medium text-slate-300 hidden sm:block">
              Dr. {user?.name || 'Doctor User'}
            </span>
            <button
              onClick={handleLogout}
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
          <div className="p-4 border-b border-slate-200">
            <Link to="/doctor/consultation/new" className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-colors shadow-sm">
              <PlusCircle className="w-5 h-5" />
              New Prescription
            </Link>
          </div>
          
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
        </aside>

        {/* Dashboard Focus Area */}
        <main className="flex-1 flex flex-col h-full overflow-hidden pb-16 md:pb-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-between px-2 py-2 z-40">
        {[
          { name: 'Dashboard', href: '/doctor', icon: LayoutDashboard },
          { name: 'Queue', href: '/doctor/queue', icon: Users },
          { name: 'Schedule', href: '/doctor/schedule', icon: Calendar },
          { name: 'Records', href: '/doctor/records', icon: FileText }
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
    </div>
  );
}
