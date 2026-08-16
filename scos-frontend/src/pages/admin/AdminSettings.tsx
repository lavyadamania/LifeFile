import { useState } from 'react';
import { Save, Globe, Bell, Database, Shield, ToggleLeft, ToggleRight, Server, RefreshCw } from 'lucide-react';
import useStreamingStore from '../../services/streaming';

interface ToggleProps {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  description: string;
}

function SettingToggle({ enabled, onToggle, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-sm font-bold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button onClick={onToggle} className="shrink-0">
        {enabled ? (
          <ToggleRight className="w-10 h-10 text-blue-600" />
        ) : (
          <ToggleLeft className="w-10 h-10 text-slate-300" />
        )}
      </button>
    </div>
  );
}

export default function AdminSettings() {
  const { isConnected, connect, disconnect } = useStreamingStore();
  const [saved, setSaved] = useState(false);

  // Local toggle state for UI demonstration
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    enforceSSL: true,
    emailNotifications: true,
    smsAlerts: false,
    auditRetention: '90',
    sessionTimeout: '30',
    clinicName: 'Smart Clinic OS',
    timezone: 'Asia/Kolkata',
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">System Configuration</h1>
          <p className="text-slate-500">Global platform settings, security policies, and infrastructure controls.</p>
        </div>
        <button 
          onClick={handleSave}
          className={`flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl shadow-sm transition-all ${
            saved 
              ? 'bg-emerald-600 text-white' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Save className="w-5 h-5" />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-800">General</h2>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Platform Name</label>
            <input 
              type="text" 
              value={settings.clinicName}
              onChange={(e) => setSettings(prev => ({ ...prev, clinicName: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white transition-colors"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Timezone</label>
              <select 
                value={settings.timezone}
                onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white font-medium text-slate-700"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+5:30)</option>
                <option value="America/New_York">America/New_York (EST, UTC-5)</option>
                <option value="Europe/London">Europe/London (GMT, UTC+0)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Session Timeout (minutes)</label>
              <input 
                type="number" 
                value={settings.sessionTimeout}
                onChange={(e) => setSettings(prev => ({ ...prev, sessionTimeout: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-800">Security & Access</h2>
        </div>
        <div className="p-6">
          <SettingToggle 
            enabled={settings.enforceSSL as boolean} 
            onToggle={() => toggle('enforceSSL')} 
            label="Enforce HTTPS/SSL" 
            description="Redirect all HTTP traffic to HTTPS. Required for HIPAA compliance."
          />
          <SettingToggle 
            enabled={settings.maintenanceMode as boolean} 
            onToggle={() => toggle('maintenanceMode')} 
            label="Maintenance Mode" 
            description="Block all non-admin users. Shows a maintenance page to patients and doctors."
          />
          <div className="pt-4">
            <label className="block text-sm font-bold text-slate-700 mb-1">Audit Log Retention (days)</label>
            <input 
              type="number" 
              value={settings.auditRetention}
              onChange={(e) => setSettings(prev => ({ ...prev, auditRetention: e.target.value }))}
              className="w-full max-w-xs px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white"
            />
            <p className="text-xs text-slate-500 mt-1">Logs older than this will be archived automatically.</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-bold text-slate-800">Notification Channels</h2>
        </div>
        <div className="p-6">
          <SettingToggle 
            enabled={settings.emailNotifications as boolean} 
            onToggle={() => toggle('emailNotifications')} 
            label="Email Notifications" 
            description="Send appointment confirmations, prescription receipts, and alerts via email."
          />
          <SettingToggle 
            enabled={settings.smsAlerts as boolean} 
            onToggle={() => toggle('smsAlerts')} 
            label="SMS Alerts (Twilio)" 
            description="Send critical alerts (queue updates, emergency notifications) via SMS. Requires Twilio API key."
          />
        </div>
      </div>

      {/* Infrastructure */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <Server className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-bold text-slate-800">Streaming Infrastructure</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
              <div>
                <p className="text-sm font-bold text-slate-800">Kafka Event Bus</p>
                <p className="text-xs text-slate-500">{isConnected ? 'Connected — receiving live events' : 'Disconnected — events paused'}</p>
              </div>
            </div>
            <button 
              onClick={isConnected ? disconnect : connect}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                isConnected 
                  ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' 
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              {isConnected ? 'Disconnect' : 'Reconnect'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-slate-400" />
                <p className="text-sm font-bold text-slate-700">Primary Database</p>
              </div>
              <p className="text-xs text-slate-500 font-mono">mysql://localhost:3306/scos_db</p>
              <p className="text-xs text-emerald-600 font-bold mt-1">● Connected</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-slate-400" />
                <p className="text-sm font-bold text-slate-700">Cache Layer</p>
              </div>
              <p className="text-xs text-slate-500 font-mono">redis://localhost:6379</p>
              <p className="text-xs text-emerald-600 font-bold mt-1">● Connected</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
