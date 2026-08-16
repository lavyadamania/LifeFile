import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, MessageSquare, X, Play, Loader2, Bot } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function PatientAIAssistant() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hello! I am your AI assistant. You can speak to me in English, Hindi, or Spanish to navigate or ask questions.' }
  ]);
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, interimTranscript, isOpen]);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      // We do not set a hardcoded lang so it tries to auto-detect or uses browser default, 
      // but if we want multi-language, we can set it or leave it default. 
      // Some browsers auto-detect if lang is not set. 
      // For best results, we can let user choose or just use default.
      
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      
      recognition.onresult = (event: any) => {
        let finalTranscriptStr = '';
        let interimTranscriptStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscriptStr += event.results[i][0].transcript;
          } else {
            interimTranscriptStr += event.results[i][0].transcript;
          }
        }

        setInterimTranscript(interimTranscriptStr);

        if (finalTranscriptStr) {
          handleUserCommand(finalTranscriptStr.trim());
          setInterimTranscript('');
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        // Handle case where it's already started
      }
    }
  };

  const handleUserCommand = (transcript: string) => {
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: transcript }]);
    
    // Simple intent matching (Free NLP via Regex/Keywords)
    const lower = transcript.toLowerCase();
    
    setTimeout(() => {
      let response = '';
      let route = '';

      // --- APPOINTMENTS ---
      // English: appointment, booking, schedule
      // Hindi: मुलाकात, अपॉइंटमेंट (appointment)
      // Spanish: cita
      if (lower.includes('appointment') || lower.includes('book') || lower.includes('schedule') || lower.includes('cita') || lower.includes('अपॉइंटमेंट') || lower.includes('मुलाकात')) {
        if (lower.includes('my') || lower.includes('mere') || lower.includes('mis')) {
          response = "Taking you to your appointments...";
          route = '/patient/appointments';
        } else {
          response = "Let's find a doctor to book an appointment.";
          route = '/patient/search';
        }
      }
      // --- PRESCRIPTIONS / RECORDS ---
      // English: prescription, history, record, timeline
      // Hindi: पर्चा, इतिहास (history), दवा (medicine)
      // Spanish: receta, historial
      else if (lower.includes('prescription') || lower.includes('history') || lower.includes('record') || lower.includes('timeline') || lower.includes('receta') || lower.includes('historial') || lower.includes('पर्चा') || lower.includes('दवा')) {
        response = "Opening your medical timeline and prescriptions...";
        route = '/patient/timeline';
      }
      // --- HOSPITALS ---
      // English: hospital, clinic
      // Hindi: अस्पताल (aspatal), क्लिनिक
      // Spanish: hospital, clinica
      else if (lower.includes('hospital') || lower.includes('clinic') || lower.includes('अस्पताल') || lower.includes('clinica')) {
        response = "Showing you the hospital directory...";
        route = '/patient/hospitals';
      }
      // --- DOCTORS ---
      // English: doctor, physician
      // Hindi: डॉक्टर (doctor), चिकित्सक
      // Spanish: doctor, médico
      else if (lower.includes('doctor') || lower.includes('médico') || lower.includes('चिकित्सक') || lower.includes('physician')) {
        response = "Taking you to the doctor search page...";
        route = '/patient/search';
      }
      // --- PROFILE / SETTINGS ---
      // English: profile, settings
      // Hindi: प्रोफाइल, सेटिंग
      // Spanish: perfil, configuración
      else if (lower.includes('profile') || lower.includes('settings') || lower.includes('perfil') || lower.includes('प्रोफाइल')) {
        response = "Opening your profile settings...";
        route = '/patient/settings';
      }
      // --- UNKNOWN ---
      else {
        response = "I'm sorry, I didn't quite catch that. You can say things like 'Book an appointment' or 'Show my prescriptions'.";
      }

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      
      // Auto-read response
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(response);
        // Simple heuristic to set lang based on input if we wanted, but default is fine.
        window.speechSynthesis.speak(utterance);
      }

      // Navigate if route was found
      if (route) {
        navigate(route);
      }

    }, 500); // slight delay for natural feel
  };

  if (!recognitionRef.current) {
    return null; // Don't render if browser doesn't support Speech API
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col mb-4">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Bot className="w-6 h-6" />
              <h3 className="font-bold">AI Assistant</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="h-80 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {interimTranscript && (
              <div className="flex justify-end">
                <div className="max-w-[80%] p-3 rounded-2xl text-sm bg-blue-400/50 text-white rounded-tr-none italic">
                  {interimTranscript}...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-center">
            <button 
              onClick={toggleListen}
              className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isListening ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
            </button>
          </div>
          <div className="pb-2 text-center text-[10px] text-slate-400">
            {isListening ? 'Listening...' : 'Tap to speak'}
          </div>
        </div>
      )}

      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-transform border-2 border-white"
        >
          <Mic className="w-6 h-6 text-white" />
        </button>
      )}
    </div>
  );
}
