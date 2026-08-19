import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Stethoscope, Loader2 } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import { loginUser } from '../lib/api';

const loginSchema = z.object({
  email: z.string().min(1, "Username / Email is required"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(['patient', 'doctor', 'hospital', 'admin']),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore(state => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

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
      
      if (from) {
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Sign in to SCOS (Smart Clinic OS)
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Or <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">create a new account</Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* SIH 1-Click Quick Demo Bar */}
        <div className="mb-4 bg-gradient-to-r from-blue-900 to-indigo-900 p-4 rounded-2xl text-white shadow-md">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-300 mb-2 flex items-center gap-1">
            <span>⚡ SIH 2026 Presentation Quick Demo Login</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => fillQuickDemo('lavya@admin', 'admin')}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-md text-xs font-medium transition-all"
            >
              👑 Admin
            </button>
            <button
              type="button"
              onClick={() => fillQuickDemo('demo.hospital.central@lifefile.test', 'hospital')}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-md text-xs font-medium transition-all"
            >
              🏥 Central Hospital
            </button>
            <button
              type="button"
              onClick={() => fillQuickDemo('demo.doctor.ananya@lifefile.test', 'doctor')}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-md text-xs font-medium transition-all"
            >
              👨‍⚕️ Dr. Ananya
            </button>
            <button
              type="button"
              onClick={() => fillQuickDemo('demo.patient.01@lifefile.test', 'patient')}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-md text-xs font-medium transition-all"
            >
              👤 P01 (Aarav Emergency)
            </button>
            <button
              type="button"
              onClick={() => fillQuickDemo('demo.patient.02@lifefile.test', 'patient')}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-md text-xs font-medium transition-all"
            >
              👤 P02 (Diya Check-In)
            </button>
            <button
              type="button"
              onClick={() => fillQuickDemo('demo.patient.03@lifefile.test', 'patient')}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-md text-xs font-medium transition-all"
            >
              👤 P03 (Kabir Conflict)
            </button>
          </div>
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
