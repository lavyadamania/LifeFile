import { useState } from 'react';
import { Stethoscope, AlertTriangle, CheckCircle, ArrowRight, BrainCircuit, Activity } from 'lucide-react';
import nlp from 'compromise';
import { useNavigate } from 'react-router-dom';

export default function SymptomTriage() {
  const [inputText, setInputText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    symptoms: string[];
    triageLevel: 'URGENT' | 'MODERATE' | 'MILD';
    conditions: string[];
    recommendation: string;
  } | null>(null);

  const navigate = useNavigate();

  // Very basic medical knowledge base for Hackathon demonstration
  const kb = [
    { symptoms: ['chest pain', 'severe', 'breathing', 'breath', 'arm pain', 'sweating'], level: 'URGENT', condition: 'Possible Cardiac Event', score: 3 },
    { symptoms: ['headache', 'dizzy', 'dizziness', 'stiff neck', 'vision', 'blurred'], level: 'URGENT', condition: 'Neurological Event / Meningitis', score: 3 },
    { symptoms: ['fever', 'cough', 'chills', 'sore throat', 'body ache'], level: 'MODERATE', condition: 'Viral Infection / Flu', score: 2 },
    { symptoms: ['stomach', 'nausea', 'vomit', 'diarrhea', 'abdomen'], level: 'MODERATE', condition: 'Gastroenteritis', score: 2 },
    { symptoms: ['rash', 'itchy', 'mild', 'sneezing', 'allergy'], level: 'MILD', condition: 'Allergic Reaction', score: 1 },
    { symptoms: ['pain', 'ache', 'tired', 'fatigue'], level: 'MILD', condition: 'General Fatigue', score: 1 },
  ];

  const analyzeSymptoms = () => {
    if (!inputText.trim()) return;
    setAnalyzing(true);
    
    setTimeout(() => {
      // Use compromise NLP to normalize and extract key terms
      const doc = nlp(inputText.toLowerCase());
      
      // Extract nouns and adjectives (likely symptoms)
      const extractedTerms = [...doc.nouns().out('array'), ...doc.adjectives().out('array')];
      
      // Split multi-word phrases and create a flat array of keywords
      const keywords = extractedTerms.join(' ').split(' ').filter(w => w.length > 2);
      
      // Add raw text checking for specific phrases like "chest pain"
      const rawLower = inputText.toLowerCase();

      let maxScore = 0;
      let matchedConditions = new Set<string>();
      let triage = 'MILD';

      kb.forEach(rule => {
        let matchCount = 0;
        rule.symptoms.forEach(sym => {
          if (rawLower.includes(sym) || keywords.includes(sym)) {
            matchCount++;
          }
        });

        if (matchCount > 0) {
          matchedConditions.add(rule.condition);
          if (rule.score > maxScore) {
            maxScore = rule.score;
            if (rule.score === 3) triage = 'URGENT';
            if (rule.score === 2) triage = 'MODERATE';
          }
        }
      });

      let rec = 'Rest and hydrate. If symptoms persist for more than 48 hours, book a general consultation.';
      if (triage === 'URGENT') rec = 'Please seek immediate emergency medical attention or go to the nearest hospital.';
      if (triage === 'MODERATE') rec = 'Please book a consultation with a doctor at your earliest convenience.';

      setResult({
        symptoms: [...new Set(keywords)].slice(0, 5), // show top 5 extracted words
        triageLevel: (maxScore === 0 ? 'MILD' : triage) as 'URGENT' | 'MODERATE' | 'MILD',
        conditions: Array.from(matchedConditions).length > 0 ? Array.from(matchedConditions) : ['Undiagnosed Mild Condition'],
        recommendation: maxScore === 0 ? 'Monitor symptoms. No immediate action required.' : rec
      });

      setAnalyzing(false);
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4">
          <BrainCircuit className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <BrainCircuit className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Smart AI Symptom Triage</h1>
          </div>
          <p className="text-blue-100 max-w-xl">
            Describe how you are feeling in your own words. Our NLP (Natural Language Processing) engine will analyze your symptoms and suggest the appropriate level of care.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            Describe Symptoms
          </h2>
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="e.g., I woke up with a severe headache and my neck feels very stiff. I also feel a bit dizzy..."
            className="w-full h-48 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-slate-50 text-slate-700 placeholder:text-slate-400 mb-4"
          />
          <button 
            onClick={analyzeSymptoms}
            disabled={analyzing || inputText.length < 5}
            className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 mt-auto shadow-md shadow-indigo-200 transition-all"
          >
            {analyzing ? (
              <><Activity className="w-5 h-5 animate-spin" /> Analyzing with NLP...</>
            ) : (
              <><BrainCircuit className="w-5 h-5" /> Analyze Symptoms</>
            )}
          </button>
        </div>

        <div className="bg-slate-50 rounded-2xl border border-slate-200 shadow-inner p-6">
          {result ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className={`p-5 rounded-2xl border flex items-start gap-4 ${
                result.triageLevel === 'URGENT' ? 'bg-red-50 border-red-200 text-red-700' :
                result.triageLevel === 'MODERATE' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                <div className="mt-1">
                  {result.triageLevel === 'URGENT' ? <AlertTriangle className="w-8 h-8" /> : 
                   result.triageLevel === 'MODERATE' ? <Activity className="w-8 h-8" /> : 
                   <CheckCircle className="w-8 h-8" />}
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-1">Triage: {result.triageLevel}</h3>
                  <p className="text-sm opacity-90">{result.recommendation}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Extracted NLP Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {result.symptoms.map((sym, i) => (
                    <span key={i} className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium shadow-sm">
                      {sym}
                    </span>
                  ))}
                  {result.symptoms.length === 0 && <span className="text-sm text-slate-400">No clear medical keywords detected.</span>}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Possible AI Matches</h4>
                <div className="space-y-2">
                  {result.conditions.map((cond, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <Stethoscope className="w-5 h-5 text-indigo-500 shrink-0" />
                      <span className="font-bold text-slate-700">{cond}</span>
                    </div>
                  ))}
                </div>
              </div>

              {result.triageLevel !== 'URGENT' && (
                <button 
                  onClick={() => navigate('/patient/search')}
                  className="w-full py-3 bg-white border-2 border-indigo-600 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                >
                  Find a Doctor <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 opacity-60">
              <BrainCircuit className="w-16 h-16 mb-4" />
              <p className="max-w-xs">Awaiting input. Type your symptoms in the box and click analyze to see NLP triage results.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
