import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Info, XOctagon } from 'lucide-react';
import { getAuditLogs } from '../../lib/api';

type Severity = 'info' | 'success' | 'warning' | 'critical';

const severityConfig: Record<Severity, { icon: typeof Shield; color: string; bg: string; border: string }> = {
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  success: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  critical: { icon: XOctagon, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  useEffect(() => {
    getAuditLogs({ severity: severityFilter !== 'all' ? severityFilter : undefined })
      .then(res => setLogs(res.data))
      .catch(() => {});
  }, [severityFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Audit Logs</h1>
        <p className="text-slate-500">Immutable compliance trail for all system actions.</p>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2 flex-wrap">
          {['all', 'info', 'success', 'warning', 'critical'].map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-colors ${
                severityFilter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {logs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 text-lg">No audit logs found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log: any) => {
              const config = severityConfig[log.severity as Severity] || severityConfig.info;
              const Icon = config.icon;
              return (
                <div key={log._id} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                  <div className={`p-2 rounded-lg ${config.bg} border ${config.border} shrink-0`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-800 text-sm">{log.action}</span>
                      <span className="text-xs font-medium text-slate-400">by {log.actor}</span>
                    </div>
                    <p className="text-sm text-slate-600 truncate">{log.target}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono text-slate-400">{log.ip}</p>
                    <p className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
