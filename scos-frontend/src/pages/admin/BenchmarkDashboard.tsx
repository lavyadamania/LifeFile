import React, { useState, useEffect } from 'react';
import { runBenchmark, getBenchmarkScenarios } from '../../lib/api';
import { Play, Download, Activity, AlertTriangle, Users, Clock, Loader2, CheckCircle } from 'lucide-react';

const BenchmarkDashboard = () => {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [selectedScenario, setSelectedScenario] = useState('normal-opd');
  const [config, setConfig] = useState({
    patientCount: 100,
    doctorCount: 1,
    emergencyRate: 0.1,
    noShowRate: 0.05,
    seed: 20260819,
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    getBenchmarkScenarios().then(res => {
      setScenarios(res.data);
      if (res.data.length > 0) {
        const initial = res.data.find((s:any) => s.id === 'normal-opd') || res.data[0];
        setSelectedScenario(initial.id);
        setConfig({
          patientCount: initial.patientCount,
          doctorCount: initial.doctorCount,
          emergencyRate: initial.emergencyRate,
          noShowRate: initial.noShowRate,
          seed: 20260819
        });
      }
    }).catch(console.error);
  }, []);

  const handleScenarioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedScenario(id);
    const s = scenarios.find(s => s.id === id);
    if (s) {
      setConfig({
        ...config,
        patientCount: s.patientCount,
        doctorCount: s.doctorCount,
        emergencyRate: s.emergencyRate,
        noShowRate: s.noShowRate
      });
    }
  };

  const executeBenchmark = async () => {
    setIsRunning(true);
    setStatusText('Preparing synthetic patient dataset (Cloning deterministic seed)...');
    setResults(null);
    
    try {
      // Simulate real-time progress for UI feeling
      setTimeout(() => setStatusText('Simulating FIFO Baseline...'), 1000);
      setTimeout(() => setStatusText('Simulating Standard Priority...'), 2000);
      setTimeout(() => setStatusText('Simulating ACPA Engine & Ablations...'), 3000);
      setTimeout(() => setStatusText('Calculating Comparative Metrics...'), 4000);
      
      const res = await runBenchmark({
        scenarioId: selectedScenario,
        customConfig: config
      });
      
      setTimeout(() => {
        setResults(res.data);
        setIsRunning(false);
        setStatusText('');
      }, 4500);

    } catch (err) {
      console.error(err);
      setStatusText('Benchmark failed. See console.');
      setIsRunning(false);
    }
  };

  const downloadCSV = () => {
    if (!results) return;
    const { results: metrics } = results;
    
    let csv = "Algorithm,Avg Wait,P95 Wait,Emergency Wait,Routine Wait,Starvation Incidents,Throughput/hr,Doctor Utilization %\n";
    Object.keys(metrics).forEach(algo => {
      const m = metrics[algo];
      csv += `${algo},${m.overall.averageWait.toFixed(2)},${m.overall.p95Wait.toFixed(2)},${m.emergency.averageWait.toFixed(2)},${m.routine.averageWait.toFixed(2)},${m.starvationIncidents},${m.throughput.toFixed(2)},${m.doctorUtilization.toFixed(2)}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SCOS_Benchmark_${selectedScenario}_${config.seed}.csv`;
    a.click();
  };

  const renderMetricCard = (title: string, fifoVal: number, priorityVal: number, acpaVal: number, lowerIsBetter = true) => {
    // Calculate winning algorithm
    let vals = [ { name: 'FIFO', val: fifoVal }, { name: 'Priority', val: priorityVal }, { name: 'ACPA', val: acpaVal } ];
    vals.sort((a,b) => lowerIsBetter ? a.val - b.val : b.val - a.val);
    const winner = vals[0].name;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-500 mb-4">{title}</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">FIFO</span>
            <span className={`text-lg font-bold ${winner === 'FIFO' ? 'text-green-600' : 'text-slate-800'}`}>{fifoVal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Priority</span>
            <span className={`text-lg font-bold ${winner === 'Priority' ? 'text-green-600' : 'text-slate-800'}`}>{priorityVal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between bg-blue-50/50 p-2 -mx-2 rounded-lg">
            <span className="text-sm font-medium text-blue-900">ACPA (SCOS)</span>
            <span className={`text-lg font-bold ${winner === 'ACPA' ? 'text-blue-700' : 'text-blue-900'}`}>{acpaVal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Activity className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-slate-900">SCOS Validation & Benchmarking Lab</h1>
            </div>
            {results && (
              <button 
                onClick={downloadCSV}
                className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Config */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
              <Users className="h-5 w-5 mr-2 text-slate-400" />
              Experiment Configuration
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Scenario Prototype</label>
                <select 
                  value={selectedScenario}
                  onChange={handleScenarioChange}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {scenarios.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Patients</label>
                  <input type="number" value={config.patientCount} onChange={e => setConfig({...config, patientCount: +e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Doctors</label>
                  <input type="number" value={config.doctorCount} onChange={e => setConfig({...config, doctorCount: +e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Rate</label>
                  <input type="number" step="0.05" value={config.emergencyRate} onChange={e => setConfig({...config, emergencyRate: +e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">No-Show Rate</label>
                  <input type="number" step="0.05" value={config.noShowRate} onChange={e => setConfig({...config, noShowRate: +e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">PRNG Seed (Reproducibility)</label>
                <input type="number" value={config.seed} onChange={e => setConfig({...config, seed: +e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" />
                <p className="text-xs text-slate-500 mt-1">Guarantees identical synthetic patient stream across all algorithms.</p>
              </div>

              <button
                onClick={executeBenchmark}
                disabled={isRunning}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center disabled:opacity-50"
              >
                {isRunning ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> {statusText}</>
                ) : (
                  <><Play className="h-5 w-5 mr-2 fill-current" /> RUN BENCHMARK</>
                )}
              </button>
            </div>
          </div>

          {results?.sampleScores && (
            <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6 text-white">
              <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                ACPA Score Inspector
              </h2>
              <p className="text-sm text-slate-400 mb-4">Live explanation for simulated patient {results.sampleScores.patient.id}</p>
              
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Token Base:</span>
                  <span className="text-blue-300">{results.sampleScores.patient.breakdown.baseScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Triage Override:</span>
                  <span className="text-pink-400">+{results.sampleScores.patient.breakdown.triageScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Wait Aging (1.5/m):</span>
                  <span className="text-emerald-400">+{results.sampleScores.patient.breakdown.agingScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Skip Penalty:</span>
                  <span className="text-red-400">{results.sampleScores.patient.breakdown.skipPenalty}</span>
                </div>
                <div className="border-t border-slate-700 pt-3 flex justify-between mt-2">
                  <span className="font-bold">FINAL CEP SCORE:</span>
                  <span className="font-bold text-white text-lg">{results.sampleScores.patient.breakdown.finalScore}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Results */}
        <div className="lg:col-span-2 space-y-6">
          {!results && !isRunning && (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 h-96 flex flex-col items-center justify-center text-slate-500">
              <Activity className="h-12 w-12 text-slate-300 mb-4" />
              <p>Configure scenario and click Run Benchmark to generate results.</p>
            </div>
          )}

          {isRunning && (
            <div className="bg-white rounded-xl border border-blue-200 h-96 flex flex-col items-center justify-center bg-blue-50/50">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
              <p className="text-blue-700 font-medium">{statusText}</p>
            </div>
          )}

          {results && (
            <>
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl flex items-start border border-emerald-100">
                <CheckCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">Simulation Complete</h4>
                  <p className="text-xs opacity-90 mt-1">Successfully tested {results.patientsGenerated} patients across all algorithms using Seed: {results.config.seed}.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderMetricCard(
                  "Avg Emergency Wait (m)", 
                  results.results.FIFO.emergency.averageWait, 
                  results.results.Priority.emergency.averageWait, 
                  results.results.ACPA.emergency.averageWait, 
                  true
                )}
                
                {renderMetricCard(
                  "P95 Routine Wait (m)", 
                  results.results.FIFO.routine.p95Wait, 
                  results.results.Priority.routine.p95Wait, 
                  results.results.ACPA.routine.p95Wait, 
                  true
                )}
                
                {renderMetricCard(
                  "Routine Starvation (>45m)", 
                  results.results.FIFO.starvationIncidents, 
                  results.results.Priority.starvationIncidents, 
                  results.results.ACPA.starvationIncidents, 
                  true
                )}

                {renderMetricCard(
                  "Overall Avg Wait (m)", 
                  results.results.FIFO.overall.averageWait, 
                  results.results.Priority.overall.averageWait, 
                  results.results.ACPA.overall.averageWait, 
                  true
                )}
              </div>

              {/* Ablation Analysis */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-8">
                <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                  ACPA Ablation Study
                </h2>
                <p className="text-sm text-slate-500 mb-6">Evaluating the mathematical contribution of individual formula components.</p>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Algorithm Variant</th>
                        <th className="px-4 py-3 font-semibold">Avg Wait</th>
                        <th className="px-4 py-3 font-semibold">Emergency Wait</th>
                        <th className="px-4 py-3 font-semibold">Starvation</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100 font-medium text-slate-900 bg-blue-50/30">
                        <td className="px-4 py-3">Full ACPA</td>
                        <td className="px-4 py-3">{results.results.ACPA.overall.averageWait.toFixed(1)}m</td>
                        <td className="px-4 py-3 text-emerald-600">{results.results.ACPA.emergency.averageWait.toFixed(1)}m</td>
                        <td className="px-4 py-3">{results.results.ACPA.starvationIncidents}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="px-4 py-3">ACPA (No Aging)</td>
                        <td className="px-4 py-3">{results.results.ACPA_NoAging.overall.averageWait.toFixed(1)}m</td>
                        <td className="px-4 py-3">{results.results.ACPA_NoAging.emergency.averageWait.toFixed(1)}m</td>
                        <td className="px-4 py-3 text-red-500 font-medium">{results.results.ACPA_NoAging.starvationIncidents} ⚠️</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="px-4 py-3">ACPA (No Triage)</td>
                        <td className="px-4 py-3">{results.results.ACPA_NoTriage.overall.averageWait.toFixed(1)}m</td>
                        <td className="px-4 py-3 text-red-500 font-medium">{results.results.ACPA_NoTriage.emergency.averageWait.toFixed(1)}m ⚠️</td>
                        <td className="px-4 py-3">{results.results.ACPA_NoTriage.starvationIncidents}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3">ACPA (No Skip Penalty)</td>
                        <td className="px-4 py-3">{results.results.ACPA_NoSkip.overall.averageWait.toFixed(1)}m</td>
                        <td className="px-4 py-3">{results.results.ACPA_NoSkip.emergency.averageWait.toFixed(1)}m</td>
                        <td className="px-4 py-3">{results.results.ACPA_NoSkip.starvationIncidents}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default BenchmarkDashboard;
