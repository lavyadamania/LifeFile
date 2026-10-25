import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Stethoscope, Loader2, Sparkles, Building2, Shield, Users, Search, Database } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import { loginUser, resetDemoData } from '../lib/api';

const loginSchema = z.object({
  email: z.string().min(1, "Username / Email is required"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(['patient', 'doctor', 'hospital', 'admin']),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface DemoAccount {
  name: string;
  email: string;
  role: 'admin' | 'hospital' | 'doctor' | 'patient';
  badge?: string;
  sub?: string;
}

const DEMO_ADMIN: DemoAccount = {
  name: 'Admin Lavya',
  email: 'lavya@admin',
  role: 'admin',
  badge: 'Master Admin',
  sub: 'System Oversight & Audit'
};

const DEMO_HOSPITALS: DemoAccount[] = [
  { name: 'Central Hospital', email: 'demo.hospital.central@lifefile.test', role: 'hospital', badge: 'Central Metro', sub: 'Cardiology, Trauma & Emergency Hub' },
  { name: 'North Hospital', email: 'demo.hospital.north@lifefile.test', role: 'hospital', badge: 'North Region', sub: 'Orthopedics, General & Gastro' },
  { name: 'Metro Trauma Inst.', email: 'demo.hospital.metro@lifefile.test', role: 'hospital', badge: 'Downtown', sub: 'Critical Care & Neurosurgery' },
  { name: 'Apex Specialty Care', email: 'demo.hospital.apex@lifefile.test', role: 'hospital', badge: 'Apex Suburbs', sub: 'Oncology, Psychiatry & ENT' },
  { name: 'St. Jude Children', email: 'demo.hospital.stjude@lifefile.test', role: 'hospital', badge: 'Family Sector', sub: 'Pediatrics, Allergy & Derma' }
];

const DEMO_DOCTORS: DemoAccount[] = [
  { name: 'Dr. Ananya Sharma', email: 'demo.doctor.ananya@lifefile.test', role: 'doctor', badge: 'Cardiology', sub: 'Central Hospital' },
  { name: 'Dr. Rohan Verma', email: 'demo.doctor.rohan@lifefile.test', role: 'doctor', badge: 'Emergency Med', sub: 'Central Hospital' },
  { name: 'Dr. Sara Khan', email: 'demo.doctor.sara@lifefile.test', role: 'doctor', badge: 'General Med', sub: 'North Hospital' },
  { name: 'Dr. Vikram Rao', email: 'demo.doctor.vikram@lifefile.test', role: 'doctor', badge: 'Pulmonology', sub: 'Central Hospital' },
  { name: 'Dr. Priya Deshmukh', email: 'demo.doctor.priya@lifefile.test', role: 'doctor', badge: 'Neurology', sub: 'Metro Trauma Inst.' },
  { name: 'Dr. Amit Patel', email: 'demo.doctor.amit@lifefile.test', role: 'doctor', badge: 'Orthopedics', sub: 'North Hospital' },
  { name: 'Dr. Neha Gupta', email: 'demo.doctor.neha@lifefile.test', role: 'doctor', badge: 'Gastroenterology', sub: 'North Hospital' },
  { name: 'Dr. Rajesh Iyer', email: 'demo.doctor.rajesh@lifefile.test', role: 'doctor', badge: 'Nephrology', sub: 'Metro Trauma Inst.' },
  { name: 'Dr. Meera Nambiar', email: 'demo.doctor.meera@lifefile.test', role: 'doctor', badge: 'Dermatology', sub: 'St. Jude Family' },
  { name: 'Dr. Sanjay Saxena', email: 'demo.doctor.sanjay@lifefile.test', role: 'doctor', badge: 'Rheumatology', sub: 'North Hospital' },
  { name: 'Dr. Kavita Singhania', email: 'demo.doctor.kavita@lifefile.test', role: 'doctor', badge: 'Pediatrics', sub: 'St. Jude Family' },
  { name: 'Dr. Alok Bhatia', email: 'demo.doctor.alok@lifefile.test', role: 'doctor', badge: 'ENT', sub: 'Apex Specialty' },
  { name: 'Dr. Sunita Rastogi', email: 'demo.doctor.sunita@lifefile.test', role: 'doctor', badge: 'Endocrinology', sub: 'Apex Specialty' },
  { name: 'Dr. Deepa Menon', email: 'demo.doctor.deepa@lifefile.test', role: 'doctor', badge: 'Oncology', sub: 'Apex Specialty' },
  { name: 'Dr. Tarun Kulkarni', email: 'demo.doctor.tarun@lifefile.test', role: 'doctor', badge: 'Psychiatry', sub: 'Apex Specialty' }
];

const PATIENT_NAMES = [
  'Aarav Sharma', 'Diya Patel', 'Kabir Joshi', 'Isha Deshmukh', 'Vihaan Kapoor',
  'Myra Nair', 'Rohan Gupta', 'Ananya Roy', 'Vikram Singh', 'Sneha Reddy',
  'Aditya Verma', 'Kavya Iyer', 'Devansh Malhotra', 'Riya Choudhury', 'Manav Bhatia',
  'Tanvi Saxena', 'Yash Vardhan', 'Ishani Banerjee', 'Siddharth Mehra', 'Pooja Kulkarni'
];

const ALL_PATIENTS: DemoAccount[] = Array.from({ length: 50 }, (_, i) => {
  const num = i + 1;
  const pad = String(num).padStart(2, '0');
  const baseName = PATIENT_NAMES[i % PATIENT_NAMES.length];
  const name = i < 20 ? baseName : `${baseName} ${num}`;

  let badge = `Patient #${pad}`;
  if (num === 1) badge = '🔴 Level 5 Emergency';
  else if (num === 2) badge = '🟢 Active Check-In';
  else if (num === 3) badge = '🟡 Allergy Conflict';

  return {
    name: `P${pad} (${name})`,
    email: `demo.patient.${pad}@lifefile.test`,
    role: 'patient',
    badge,
    sub: `Queue ID: P-${pad}`
  };
});

const QUICK_PICKS: DemoAccount[] = [
  DEMO_ADMIN,
  DEMO_HOSPITALS[0],
  DEMO_DOCTORS[0],
  DEMO_DOCTORS[1],
  ALL_PATIENTS[0],
  ALL_PATIENTS[1],
  ALL_PATIENTS[2]
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore(state => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingDemo, setIsResettingDemo] = useState(false);
  const [serverError, setServerError] = useState('');
  const [demoStatus, setDemoStatus] = useState('');
  const [demoTab, setDemoTab] = useState<'quick' | 'hospital' | 'doctor' | 'patient' | 'admin'>('quick');
  const [patientSearch, setPatientSearch] = useState('');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { role: 'admin' }
  });

  const from = location.state?.from?.pathname;

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setServerError('');
    
    try {
      const res = await loginUser(data);
      const { token, user } = res.data;
      
      setAuth(user, token, user.role);
      
      // Only redirect to 'from' if it belongs to this user's role to prevent 403 errors across user switches
      const isFromRoleMatch = Boolean(
        from &&
        !from.startsWith('/unauthorized') &&
        !from.startsWith('/login') &&
        from.startsWith(`/${user.role}`)
      );

      if (isFromRoleMatch) {
        navigate(from, { replace: true });
      } else {
        navigate(`/${user.role}`, { replace: true });
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Login failed. Is the backend running?';
      setServerError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickDemo = (email: string, role: 'admin' | 'doctor' | 'patient' | 'hospital') => {
    setValue('email', email);
    setValue('password', 'Demo@123');
    setValue('role', role);
    handleSubmit(onSubmit)();
  };

  const handleResetDemo = async () => {
    if (!window.confirm('This will clear all database data and recreate the full demo dataset. Continue?')) return;

    setIsResettingDemo(true);
    setServerError('');
    setDemoStatus('Clearing and seeding demo data...');

    try {
      await resetDemoData();
      setValue('email', DEMO_ADMIN.email);
      setValue('password', 'Demo@123');
      setValue('role', DEMO_ADMIN.role);
      setDemoStatus('Demo data is ready. Admin credentials have been filled in.');
    } catch (err: any) {
      setDemoStatus('');
      setServerError(err.response?.data?.error || 'Demo data reset failed. Is the backend running?');
    } finally {
      setIsResettingDemo(false);
    }
  };

  const filteredPatients = ALL_PATIENTS.filter(p => 
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) || 
    p.email.toLowerCase().includes(patientSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-5 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Sign in to LifeFile
        </h2>
        <p className="mt-1 text-center text-sm text-slate-600">
          Or <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">create a new account</Link>
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-2xl">
        {/* SIH 1-Click Master Demo Accounts Panel */}
        <div className="mb-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 p-4 sm:p-5 rounded-2xl text-white shadow-xl border border-indigo-800/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-indigo-800/50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                1-Click Demo Accounts Directory (71 Users)
              </span>
            </div>
            {/* Counts Badges */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-200">
              <span className="bg-white/10 px-2 py-0.5 rounded-md border border-white/10">👑 1 Admin</span>
              <span className="bg-white/10 px-2 py-0.5 rounded-md border border-white/10">🏥 5 Hospitals</span>
              <span className="bg-white/10 px-2 py-0.5 rounded-md border border-white/10">👨‍⚕️ 15 Doctors</span>
              <span className="bg-white/10 px-2 py-0.5 rounded-md border border-white/10">👤 50 Patients</span>
            </div>
          </div>

          {/* Role Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 mt-3 text-xs font-medium">
            <button
              type="button"
              onClick={() => setDemoTab('quick')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                demoTab === 'quick' ? 'bg-blue-600 text-white shadow-md' : 'bg-white/5 hover:bg-white/15 text-slate-300'
              }`}
            >
              ⭐ Quick Picks (7)
            </button>
            <button
              type="button"
              onClick={() => setDemoTab('admin')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                demoTab === 'admin' ? 'bg-amber-600 text-white shadow-md' : 'bg-white/5 hover:bg-white/15 text-slate-300'
              }`}
            >
              👑 Admin (1)
            </button>
            <button
              type="button"
              onClick={() => setDemoTab('hospital')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                demoTab === 'hospital' ? 'bg-purple-600 text-white shadow-md' : 'bg-white/5 hover:bg-white/15 text-slate-300'
              }`}
            >
              🏥 Hospitals (5)
            </button>
            <button
              type="button"
              onClick={() => setDemoTab('doctor')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                demoTab === 'doctor' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white/5 hover:bg-white/15 text-slate-300'
              }`}
            >
              👨‍⚕️ Doctors (15)
            </button>
            <button
              type="button"
              onClick={() => setDemoTab('patient')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                demoTab === 'patient' ? 'bg-cyan-600 text-white shadow-md' : 'bg-white/5 hover:bg-white/15 text-slate-300'
              }`}
            >
              👤 Patients (50)
            </button>
          </div>

          {/* Tab Content Display */}
          <div className="mt-3">
            {/* Quick Picks */}
            {demoTab === 'quick' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {QUICK_PICKS.map((acc, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={isLoading}
                    onClick={() => fillQuickDemo(acc.email, acc.role)}
                    className="flex flex-col text-left p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/25 transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-white">
                      <span className="truncate group-hover:text-amber-300 transition-colors">{acc.name}</span>
                      <span className="text-[10px] bg-white/15 px-1.5 py-0.5 rounded text-blue-200 capitalize ml-1 shrink-0">{acc.role}</span>
                    </div>
                    <span className="text-[11px] text-slate-300 truncate mt-0.5">{acc.sub || acc.badge}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Admin (1) */}
            {demoTab === 'admin' && (
              <div className="p-3 bg-white/10 rounded-xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-amber-300">{DEMO_ADMIN.name}</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono">👑 admin</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{DEMO_ADMIN.email} &bull; Password: <code className="bg-black/30 px-1 py-0.5 rounded">Demo@123</code></p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{DEMO_ADMIN.sub}</p>
                </div>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => fillQuickDemo(DEMO_ADMIN.email, DEMO_ADMIN.role)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-md transition-all shrink-0"
                >
                  ⚡ Login as Admin
                </button>
              </div>
            )}

            {/* Hospitals (5) */}
            {demoTab === 'hospital' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEMO_HOSPITALS.map((h, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={isLoading}
                    onClick={() => fillQuickDemo(h.email, h.role)}
                    className="flex flex-col text-left p-2.5 rounded-xl bg-purple-900/30 hover:bg-purple-800/50 border border-purple-500/20 hover:border-purple-400/40 transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-white">
                      <span className="truncate group-hover:text-purple-200">🏥 {h.name}</span>
                      <span className="text-[10px] bg-purple-500/20 text-purple-200 px-1.5 py-0.5 rounded">{h.badge}</span>
                    </div>
                    <span className="text-[11px] text-slate-300 truncate mt-0.5">{h.sub}</span>
                    <span className="text-[10px] text-slate-400 mt-1 font-mono">{h.email}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Doctors (15) */}
            {demoTab === 'doctor' && (
              <div className="max-h-56 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {DEMO_DOCTORS.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={isLoading}
                    onClick={() => fillQuickDemo(d.email, d.role)}
                    className="flex flex-col text-left p-2 rounded-xl bg-emerald-900/30 hover:bg-emerald-800/50 border border-emerald-500/20 hover:border-emerald-400/40 transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-white">
                      <span className="truncate group-hover:text-emerald-200">👨‍⚕️ {d.name}</span>
                    </div>
                    <span className="text-[11px] text-emerald-300 font-medium truncate">{d.badge}</span>
                    <span className="text-[10px] text-slate-400 truncate">{d.sub}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Patients (50) */}
            {demoTab === 'patient' && (
              <div>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Search all 50 patients (e.g. 01, Aarav, Diya, Kabir...)"
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/10 border border-white/15 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                  {filteredPatients.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={isLoading}
                      onClick={() => fillQuickDemo(p.email, p.role)}
                      className="flex flex-col text-left p-2 rounded-lg bg-cyan-950/40 hover:bg-cyan-800/50 border border-cyan-500/20 hover:border-cyan-400/40 transition-all group disabled:opacity-50"
                    >
                      <span className="text-xs font-medium text-white group-hover:text-cyan-200 truncate">{p.name}</span>
                      <span className="text-[10px] text-cyan-300 truncate">{p.badge}</span>
                    </button>
                  ))}
                  {filteredPatients.length === 0 && (
                    <div className="col-span-full py-4 text-center text-xs text-slate-400">
                      No patients matching "{patientSearch}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-semibold text-amber-950">Demo data controls</p>
              <p className="text-xs text-amber-800">Clears the database and recreates the complete presentation dataset.</p>
              {demoStatus && <p className="mt-1 text-xs font-medium text-amber-900">{demoStatus}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetDemo}
            disabled={isLoading || isResettingDemo}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isResettingDemo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            {isResettingDemo ? 'Resetting...' : 'Reset & Seed Demo Data'}
          </button>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-slate-100">
          
          {serverError && (
            <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-600">
              {serverError}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">I am a...</label>
              <div className="grid grid-cols-4 gap-3">
                {['patient', 'doctor', 'hospital', 'admin'].map((r) => (
                  <label key={r} className="cursor-pointer">
                    <input type="radio" value={r} {...register('role')} className="peer sr-only" />
                    <div className="text-center px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 peer-checked:bg-blue-50 peer-checked:border-blue-500 peer-checked:text-blue-700 transition-all hover:bg-slate-50 capitalize">
                      {r}
                    </div>
                  </label>
                ))}
              </div>
              {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Email address</label>
              <div className="mt-1">
                <input
                  type="text"
                  placeholder="lavya@admin or demo.patient.01@lifefile.test"
                  {...register('email')}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <div className="mt-1">
                <input
                  type="password"
                  placeholder="Demo@123"
                  {...register('password')}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                />
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
