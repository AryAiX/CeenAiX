import { useState } from 'react';
import { MessageSquare, Search, Send } from 'lucide-react';

const conversations = [
  { id: '1', name: 'Ahmed Al Rashidi', last: 'Thank you doctor, I will follow the prescription.', time: '10:32 AM', unread: 0, initials: 'AA' },
  { id: '2', name: 'Dr. Fatima Hassan', last: 'Patient Sara needs a follow-up this week.', time: '09:15 AM', unread: 2, initials: 'FH' },
  { id: '3', name: 'Layla Al Mansoori', last: 'Can I reschedule my 2 PM appointment?', time: 'Yesterday', unread: 1, initials: 'LA' },
  { id: '4', name: 'Dr. Khalid Nasser', last: 'Lab results for Omar are ready.', time: 'Yesterday', unread: 0, initials: 'KN' },
];

const mockMessages: Record<string, { from: string; text: string; time: string }[]> = {
  '1': [
    { from: 'them', text: 'Hello, I wanted to confirm my appointment for tomorrow.', time: '10:00 AM' },
    { from: 'me', text: 'Yes, your appointment is confirmed at 9:00 AM with Dr. Fatima Hassan.', time: '10:05 AM' },
    { from: 'them', text: 'Thank you doctor, I will follow the prescription.', time: '10:32 AM' },
  ],
  '2': [
    { from: 'them', text: 'Patient Sara needs a follow-up this week.', time: '09:15 AM' },
    { from: 'them', text: 'Her HbA1c results came back — we should discuss the medication adjustment.', time: '09:16 AM' },
  ],
  '3': [
    { from: 'them', text: 'Can I reschedule my 2 PM appointment?', time: 'Yesterday' },
  ],
  '4': [
    { from: 'them', text: 'Lab results for Omar are ready.', time: 'Yesterday' },
    { from: 'me', text: 'Thanks, I will review them before the appointment.', time: 'Yesterday' },
  ],
};

export default function ClinicMessages() {
  const [selected, setSelected] = useState<string | null>('1');
  const [input, setInput] = useState('');

  const conv = selected ? conversations.find(c => c.id === selected) : null;
  const msgs = selected ? (mockMessages[selected] || []) : [];

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 64px)' }}>
      {/* List */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Search conversations…" className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 ${selected === c.id ? 'bg-teal-50' : ''}`}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {c.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 text-sm">{c.name}</span>
                  <span className="text-xs text-slate-400">{c.time}</span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">{c.last}</p>
              </div>
              {c.unread > 0 && (
                <span className="w-5 h-5 bg-teal-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">{c.unread}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {conv ? (
          <>
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">{conv.initials}</div>
              <div>
                <div className="font-semibold text-slate-800">{conv.name}</div>
                <div className="text-xs text-emerald-500 font-medium">Online</div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${m.from === 'me' ? 'bg-teal-600 text-white rounded-br-sm' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm'}`}>
                    <p>{m.text}</p>
                    <p className={`text-[10px] mt-1 ${m.from === 'me' ? 'text-teal-100' : 'text-slate-400'}`}>{m.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white border-t border-slate-200 p-4 flex items-center gap-3">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                onKeyDown={e => e.key === 'Enter' && setInput('')}
              />
              <button onClick={() => setInput('')} className="w-10 h-10 bg-teal-600 hover:bg-teal-700 rounded-xl flex items-center justify-center transition-colors">
                <Send size={16} className="text-white" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <MessageSquare size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Select a conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
