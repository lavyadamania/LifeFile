import { useState } from 'react';
import { HeartPulse, Activity, AlertCircle, CheckCircle2, Info, ArrowRight } from 'lucide-react';

export default function AIPredictor() {
  const [formData, setFormData] = useState({
    age: 45,
    gender: 'male',
    weight: 75,
    height: 175,
    cholesterol: 200,
    hdl: 50,
    ldl: 100,
    systolic: 120,
    diastolic: 80,
    smoker: false,
    cigarettesPerDay: 10,
    diabetes: false,
    sugar: 100,
    bpTreated: false
  });

  const [riskScore, setRiskScore] = useState<number | null>(null);

  // A simplified cardiovascular risk estimation algorithm (heuristic inspired by Framingham)
  const calculateRisk = () => {
    let score = 0;
    const { age, gender, weight, height, cholesterol, hdl, ldl, systolic, diastolic, smoker, cigarettesPerDay, diabetes, sugar, bpTreated } = formData;
    
    // Baseline risk by age
    score += (age - 30) * 0.5;

    // Gender factor
    if (gender === 'male') score += 5;

    // BMI Calculation
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    if (bmi > 25 && bmi <= 30) {
      score += (bmi - 25) * 0.5; // Overweight
    } else if (bmi > 30) {
      score += 2.5 + ((bmi - 30) * 1.0); // Obese
    }

    // Blood Pressure
    if (systolic > 120) {
      score += (systolic - 120) * (bpTreated ? 0.2 : 0.15);
    }
    if (diastolic > 80) {
      score += (diastolic - 80) * (bpTreated ? 0.2 : 0.15);
    }

    // Cholesterol
    if (cholesterol > 160) score += (cholesterol - 160) * 0.05;
    if (ldl > 100) score += (ldl - 100) * 0.05;
    
    // HDL (Good cholesterol reduces risk)
    if (hdl < 40) score += 5;
    if (hdl > 60) score -= 5;

    // Lifestyle & Conditions
    if (smoker) {
      score += 5 + (cigarettesPerDay * 0.5);
    }
    
    if (diabetes) {
      score += 5;
      if (sugar > 125) {
        score += (sugar - 125) * 0.1;
      }
    }

    // Normalize to a percentage (0-100) using a logistic curve approx
    const percentage = 100 / (1 + Math.exp(-0.1 * (score - 25)));
    
    setRiskScore(Math.min(99, Math.max(1, percentage)));
  };

  const getRiskCategory = (score: number) => {
    if (score < 10) return { label: 'Low Risk', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
    if (score < 20) return { label: 'Moderate Risk', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
    return { label: 'High Risk', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-20">
          <HeartPulse className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <HeartPulse className="w-8 h-8" />
            <h1 className="text-3xl font-bold">AI Cardiovascular Risk Predictor</h1>
          </div>
          <p className="text-white/80 max-w-xl">
            This tool uses a machine-learning inspired predictive model to estimate your 10-year risk of developing cardiovascular disease based on your clinical vitals.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur">
            <Activity className="w-4 h-4" /> Predictive Analytics Engine
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Input Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4">Patient Vitals Data</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Age (Years)</label>
              <div className="flex items-center gap-4">
                <input type="range" min="5" max="110" value={formData.age} onChange={(e) => setFormData({...formData, age: Number(e.target.value)})} className="flex-1 accent-rose-500" />
                <span className="w-12 text-center font-bold text-slate-700 bg-slate-50 py-1 rounded border border-slate-200">{formData.age}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Gender</label>
              <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200">
                <button onClick={() => setFormData({...formData, gender: 'male'})} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-colors ${formData.gender === 'male' ? 'bg-white shadow text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>Male</button>
                <button onClick={() => setFormData({...formData, gender: 'female'})} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-colors ${formData.gender === 'female' ? 'bg-white shadow text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>Female</button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Height (cm)</label>
              <div className="flex items-center gap-4">
                <input type="range" min="100" max="250" value={formData.height} onChange={(e) => setFormData({...formData, height: Number(e.target.value)})} className="flex-1 accent-rose-500" />
                <span className="w-12 text-center font-bold text-slate-700 bg-slate-50 py-1 rounded border border-slate-200">{formData.height}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Weight (kg)</label>
              <div className="flex items-center gap-4">
                <input type="range" min="30" max="200" value={formData.weight} onChange={(e) => setFormData({...formData, weight: Number(e.target.value)})} className="flex-1 accent-rose-500" />
                <span className="w-12 text-center font-bold text-slate-700 bg-slate-50 py-1 rounded border border-slate-200">{formData.weight}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Systolic BP (mmHg)</label>
              <div className="flex items-center gap-4">
                <input type="range" min="90" max="200" value={formData.systolic} onChange={(e) => setFormData({...formData, systolic: Number(e.target.value)})} className="flex-1 accent-rose-500" />
                <span className="w-12 text-center font-bold text-slate-700 bg-slate-50 py-1 rounded border border-slate-200">{formData.systolic}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Diastolic BP (mmHg)</label>
              <div className="flex items-center gap-4">
                <input type="range" min="60" max="130" value={formData.diastolic} onChange={(e) => setFormData({...formData, diastolic: Number(e.target.value)})} className="flex-1 accent-rose-500" />
                <span className="w-12 text-center font-bold text-slate-700 bg-slate-50 py-1 rounded border border-slate-200">{formData.diastolic}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Total Cholesterol (mg/dL)</label>
              <div className="flex items-center gap-4">
                <input type="range" min="130" max="320" value={formData.cholesterol} onChange={(e) => setFormData({...formData, cholesterol: Number(e.target.value)})} className="flex-1 accent-rose-500" />
                <span className="w-12 text-center font-bold text-slate-700 bg-slate-50 py-1 rounded border border-slate-200">{formData.cholesterol}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">HDL "Good" Cholesterol</label>
              <div className="flex items-center gap-4">
                <input type="range" min="20" max="100" value={formData.hdl} onChange={(e) => setFormData({...formData, hdl: Number(e.target.value)})} className="flex-1 accent-rose-500" />
                <span className="w-12 text-center font-bold text-slate-700 bg-slate-50 py-1 rounded border border-slate-200">{formData.hdl}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">LDL "Bad" Cholesterol</label>
              <div className="flex items-center gap-4">
                <input type="range" min="50" max="250" value={formData.ldl} onChange={(e) => setFormData({...formData, ldl: Number(e.target.value)})} className="flex-1 accent-rose-500" />
                <span className="w-12 text-center font-bold text-slate-700 bg-slate-50 py-1 rounded border border-slate-200">{formData.ldl}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2 md:col-span-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 transition-colors">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.smoker} onChange={e => setFormData({...formData, smoker: e.target.checked})} className="w-5 h-5 text-rose-500 rounded focus:ring-rose-500" />
                  <div><p className="text-sm font-bold text-slate-800">Current Smoker</p><p className="text-xs text-slate-500">Do you smoke cigarettes regularly?</p></div>
                </label>
                {formData.smoker && (
                  <div className="mt-4 pt-3 border-t border-slate-200 pl-8">
                    <label className="block text-xs font-bold text-slate-700 mb-2">Cigarettes per day</label>
                    <div className="flex items-center gap-4">
                      <input type="range" min="1" max="60" value={formData.cigarettesPerDay} onChange={(e) => setFormData({...formData, cigarettesPerDay: Number(e.target.value)})} className="flex-1 accent-rose-500" />
                      <span className="w-12 text-center font-bold text-slate-700 bg-white py-1 rounded border border-slate-200 text-sm">{formData.cigarettesPerDay}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 transition-colors">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.diabetes} onChange={e => setFormData({...formData, diabetes: e.target.checked})} className="w-5 h-5 text-rose-500 rounded focus:ring-rose-500" />
                  <div><p className="text-sm font-bold text-slate-800">History of Diabetes</p><p className="text-xs text-slate-500">Have you been diagnosed with diabetes?</p></div>
                </label>
                {formData.diabetes && (
                  <div className="mt-4 pt-3 border-t border-slate-200 pl-8">
                    <label className="block text-xs font-bold text-slate-700 mb-2">Fasting Blood Sugar (mg/dL)</label>
                    <div className="flex items-center gap-4">
                      <input type="range" min="70" max="300" value={formData.sugar} onChange={(e) => setFormData({...formData, sugar: Number(e.target.value)})} className="flex-1 accent-rose-500" />
                      <span className="w-12 text-center font-bold text-slate-700 bg-white py-1 rounded border border-slate-200 text-sm">{formData.sugar}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 transition-colors">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.bpTreated} onChange={e => setFormData({...formData, bpTreated: e.target.checked})} className="w-5 h-5 text-rose-500 rounded focus:ring-rose-500" />
                  <div><p className="text-sm font-bold text-slate-800">BP Medication</p><p className="text-xs text-slate-500">Are you on blood pressure medication?</p></div>
                </label>
              </div>
            </div>
          </div>

          <button 
            onClick={calculateRisk}
            className="w-full py-4 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-200 mt-6"
          >
            <Activity className="w-5 h-5" /> Calculate AI Risk Score
          </button>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-6"><AlertCircle className="w-5 h-5 text-rose-400" /> AI Prediction Result</h3>
            
            {riskScore === null ? (
              <div className="text-center py-12 text-slate-400">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Enter your vitals and click calculate to see your risk score.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-8 border-slate-800 bg-slate-800 relative shadow-[0_0_30px_rgba(225,29,72,0.3)]">
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="46" fill="none" stroke="#e2e8f0" strokeWidth="8" className="opacity-10" />
                      <circle cx="50" cy="50" r="46" fill="none" stroke={riskScore < 10 ? '#10b981' : riskScore < 20 ? '#f59e0b' : '#ef4444'} strokeWidth="8" strokeDasharray={`${riskScore * 2.89} 289`} className="transition-all duration-1000 ease-out" />
                    </svg>
                    <div className="relative z-10 flex flex-col items-center">
                      <span className="text-4xl font-bold">{riskScore.toFixed(1)}<span className="text-lg">%</span></span>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${getRiskCategory(riskScore).bg} ${getRiskCategory(riskScore).border}`}>
                  <p className={`text-center font-bold text-lg mb-1 ${getRiskCategory(riskScore).color}`}>{getRiskCategory(riskScore).label}</p>
                  <p className="text-xs text-slate-600 text-center">Estimated probability of a cardiovascular event within 10 years.</p>
                </div>

                <div className="bg-slate-800 rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-sm text-slate-300">AI Recommendations</h4>
                  {(() => {
                    const heightInM = formData.height / 100;
                    const bmiValue = formData.weight / (heightInM * heightInM);
                    return (
                      <div className="mb-3 p-3 bg-slate-900 rounded-lg border border-slate-700 text-center">
                         <span className="text-xs text-slate-400 block mb-1">Calculated BMI</span>
                         <span className={`text-lg font-bold ${bmiValue > 30 ? 'text-red-400' : bmiValue > 25 ? 'text-amber-400' : 'text-emerald-400'}`}>
                           {bmiValue.toFixed(1)} 
                         </span>
                         <span className="text-xs text-slate-500 ml-2">
                           ({bmiValue > 30 ? 'Obese' : bmiValue > 25 ? 'Overweight' : 'Normal'})
                         </span>
                      </div>
                    );
                  })()}
                  {riskScore >= 20 ? (
                     <ul className="text-sm text-slate-400 space-y-2">
                       <li className="flex items-start gap-2"><ArrowRight className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" /> High risk detected. Please schedule a consultation with a cardiologist immediately.</li>
                       {formData.smoker && <li className="flex items-start gap-2"><ArrowRight className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" /> Quitting smoking is the #1 way to reduce your risk profile.</li>}
                     </ul>
                  ) : riskScore >= 10 ? (
                     <ul className="text-sm text-slate-400 space-y-2">
                       <li className="flex items-start gap-2"><ArrowRight className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" /> Moderate risk. Consider lifestyle changes and monitoring your cholesterol.</li>
                       {formData.systolic > 130 && <li className="flex items-start gap-2"><ArrowRight className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" /> Your blood pressure is elevated. Reduce sodium intake.</li>}
                     </ul>
                  ) : (
                     <ul className="text-sm text-slate-400 space-y-2">
                       <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> Your risk profile is excellent. Keep up the healthy lifestyle!</li>
                     </ul>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 leading-relaxed">
              <strong>Disclaimer:</strong> This is a demonstration predictive tool and should not be used as a substitute for professional medical advice, diagnosis, or treatment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
