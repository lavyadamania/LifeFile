import { useState, useEffect } from 'react';
import { Pill, Search } from 'lucide-react';
import { getPrescriptions } from '../../lib/api';

export default function DoctorRecords() {
  const [records, setRecords] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    getPrescriptions().then(res => setRecords(res.data)).catch(() => {});
  }, []);

  const filtered = records.filter((r: any) =>
    r.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Medical Records</h1>
          <p className="text-slate-500">{records.length} records found.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
          <input type="text" placeholder="Search by patient or diagnosis..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500 text-lg">No medical records yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rec: any) => (
            <div key={rec._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-800">{rec.diagnosis || 'No diagnosis'}</h3>
                  <p className="text-sm text-slate-600 mt-1">Patient: {rec.patientName || 'Unknown'}</p>
                  <p className="text-xs text-slate-400 mt-1">{new Date(rec.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                  <Pill className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-700">{rec.medications?.length || 0} meds</span>
                </div>
              </div>
              {rec.medications?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                  {rec.medications.map((med: any, i: number) => (
                    <span key={i} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">{med.name} {med.dosage}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
