import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, MapPin, Phone, Users, ChevronRight, Filter } from 'lucide-react';
import { getHospitals } from '../../lib/api';

const DEPARTMENTS = ['All', 'Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics', 'Dermatology', 'General Practice', 'Oncology', 'Radiology'];

export default function SearchHospitals() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getHospitals({
      search: searchTerm || undefined,
      department: deptFilter !== 'All' ? deptFilter : undefined,
    })
      .then(res => setHospitals(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [searchTerm, deptFilter]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-30"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Find a Hospital</h1>
          </div>
          <p className="text-white/80 mb-6 max-w-lg">Browse hospitals, view their departments and doctors, and book appointments directly.</p>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search hospitals by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/95 backdrop-blur text-slate-800 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm"
              />
              <Search className="w-6 h-6 text-slate-400 absolute left-4 top-3" />
            </div>

            <div className="relative w-full sm:w-64 flex-shrink-0">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full bg-white/95 backdrop-blur text-slate-800 rounded-xl py-3 pl-12 pr-4 appearance-none focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm cursor-pointer font-medium"
              >
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <Filter className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">
            {hospitals.length} Hospital{hospitals.length !== 1 ? 's' : ''} Found
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : hospitals.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-lg font-medium">No hospitals found.</p>
            <button
              onClick={() => { setSearchTerm(''); setDeptFilter('All'); }}
              className="mt-4 text-indigo-600 font-medium hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hospitals.map((hospital: any) => (
              <div
                key={hospital._id}
                onClick={() => navigate(`/patient/hospital/${hospital._id}`)}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center border border-indigo-200/50">
                      <Building2 className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {hospital.name}
                      </h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        hospital.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {hospital.status === 'active' ? 'Active' : 'Maintenance'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{hospital.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    {hospital.phone}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    {hospital.doctors?.length || 0} Doctor{(hospital.doctors?.length || 0) !== 1 ? 's' : ''} on Staff
                  </div>
                </div>

                {hospital.departments?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {hospital.departments.slice(0, 5).map((dept: string) => (
                      <span key={dept} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-md border border-indigo-100">
                        {dept}
                      </span>
                    ))}
                    {hospital.departments.length > 5 && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-medium rounded-md">
                        +{hospital.departments.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
