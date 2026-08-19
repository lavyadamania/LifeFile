import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Star, MapPin, Clock, Building2 } from 'lucide-react';
import { getDoctors } from '../../lib/api';

const SPECIALIZATIONS = [
  'All', 
  'Cardiology', 
  'Orthopedics', 
  'Pathology', 
  'Neurology', 
  'General Practice', 
  'Emergency Medicine', 
  'Pediatrics', 
  'Dermatology', 
  'Oncology', 
  'Radiology'
];

export default function SearchDoctors() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [specFilter, setSpecFilter] = useState('All');
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    getDoctors({
      search: searchTerm || undefined,
      spec: specFilter !== 'All' ? specFilter : undefined,
    }).then(res => setDoctors(res.data)).catch(() => {});
  }, [searchTerm, specFilter]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header & Search Bar */}
      <div className="bg-blue-600 rounded-2xl p-8 text-white shadow-md">
        <h1 className="text-3xl font-bold mb-2">Find a Doctor</h1>
        <p className="text-blue-100 mb-6">Search by name, specialty, or condition to book an appointment.</p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Search doctors, specialties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white text-slate-800 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm"
            />
            <Search className="w-6 h-6 text-slate-400 absolute left-4 top-3" />
          </div>
          
          <div className="relative w-full sm:w-64 flex-shrink-0">
            <select 
              value={specFilter}
              onChange={(e) => setSpecFilter(e.target.value)}
              className="w-full bg-white text-slate-800 rounded-xl py-3 pl-12 pr-4 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm cursor-pointer font-medium"
            >
              {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <Filter className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Available Specialists</h2>
        
        {doctors.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500 text-lg">No doctors found.</p>
            <button 
              onClick={() => {setSearchTerm(''); setSpecFilter('All');}}
              className="mt-4 text-blue-600 font-medium hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {doctors.map((doctor: any) => (
              <div key={doctor._id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-6">
                
                <div className="flex-shrink-0 flex justify-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                    <span className="text-2xl font-bold text-slate-400">{doctor.name?.charAt(0)}</span>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-xl font-bold text-slate-800">{doctor.name}</h3>
                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-amber-700 text-sm">{doctor.rating || 'New'}</span>
                    </div>
                  </div>
                  
                  <p className="text-blue-600 font-medium text-sm mb-3">{doctor.specialization}</p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {doctor.location}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {doctor.hours}
                    </div>
                    {doctor.hospitals?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {doctor.hospitals.map((h: any) => (
                          <span key={h} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded text-xs font-medium">
                            <Building2 className="w-3 h-3" />
                            {h.name || 'Hospital Affiliated'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => navigate(`/patient/doctor/${doctor._id}`)}
                    className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                  >
                    View Profile
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
