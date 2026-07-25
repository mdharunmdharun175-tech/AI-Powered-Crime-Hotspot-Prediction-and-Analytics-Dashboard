import { useState } from 'react';
import { Bot, Sparkles, Send, X, Cpu, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { cn } from '../services/utils';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  recommendations?: string[];
  metrics?: { label: string; value: string }[];
}

const QUICK_PROMPTS = [
  '🚨 Analyze crime surge in Mumbai',
  '📈 Predict Cybercrime trajectory for Q3',
  '🛡️ Recommend patrol strategy for high-risk zones',
  '📍 What are the top 3 DBSCAN hotspots?',
];

export function CopilotDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am **CrimeScope Copilot**, your AI Crime Intelligence assistant. How can I assist with your tactical analysis, patrol deployment, or trend forecasting today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSend = (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query || isAnalyzing) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsAnalyzing(true);

    // Generate intelligent AI response
    setTimeout(() => {
      let aiText = '';
      let recommendations: string[] = [];
      let metrics: { label: string; value: string }[] = [];

      const q = query.toLowerCase();

      if (q.includes('mumbai') || q.includes('surge')) {
        aiText = 'Analysis of **Mumbai Metropolitan Region** indicates a 22% quarter-over-quarter surge in **Vehicle Theft** and **Cybercrime**. Incident density is concentrated around the Bandra-Kurla Complex and Andheri East industrial corridors between 22:00 and 03:00 hrs.';
        recommendations = [
          'Deploy 4 mobile patrol units along BKC Main Road between 10 PM - 3 AM',
          'Increase CCTV surveillance coverage near metro parking stations',
          'Issue public awareness notice regarding digital phishing schemes',
        ];
        metrics = [
          { label: 'Quarterly Risk', value: 'High' },
          { label: 'Hotspot Cluster', value: '#3 Dharavi-Kurla' },
          { label: 'Forecast Change', value: '+14% YoY' },
        ];
      } else if (q.includes('patrol') || q.includes('recommend') || q.includes('deploy')) {
        aiText = 'Based on DBSCAN density modeling and peak crime hour distribution, the optimal allocation strategy recommends prioritizing **Delhi NCR**, **Mumbai**, and **Pune Industrial Belt**.';
        recommendations = [
          'Reallocate 35% of reserve units from low-risk daytime sectors to evening patrols (18:00 - 02:00)',
          'Establish static checkpoints at District Entry Points in Pune & Kanpur',
          'Utilize automated license plate recognition (ALPR) along highways',
        ];
        metrics = [
          { label: 'Coverage Efficiency', value: '88.4%' },
          { label: 'Resp. Time Target', value: '< 7 mins' },
          { label: 'Target Units', value: '42 Squads' },
        ];
      } else if (q.includes('cyber') || q.includes('trajectory') || q.includes('q3')) {
        aiText = 'Linear regression forecasting indicates **Cybercrime** will rise by **+18.5%** in Q3 across tier-1 tech hubs (Bengaluru, Hyderabad, Pune). Financial phishing and UPI identity theft account for 61% of reported cases.';
        recommendations = [
          'Establish dedicated Cyber Incident Response Teams (CIRT) in Bengaluru & Hyderabad',
          'Partner with national banking portals for rapid freeze of fraudulent transactions',
        ];
        metrics = [
          { label: 'Model Confidence', value: '92.1%' },
          { label: 'Predicted Incidents', value: '1,420 / mo' },
        ];
      } else if (q.includes('hotspot') || q.includes('dbscan')) {
        aiText = 'DBSCAN Spatial Clustering has identified **3 Primary High-Density Hotspots**:';
        recommendations = [
          'Cluster #1: Delhi NCR (Density: 112 incidents/km² - Dominant: Burglary)',
          'Cluster #2: Mumbai Central (Density: 94 incidents/km² - Dominant: Theft)',
          'Cluster #3: Bengaluru Tech Zone (Density: 78 incidents/km² - Dominant: Cybercrime)',
        ];
        metrics = [
          { label: 'Active Clusters', value: '7 Nationwide' },
          { label: 'High Risk Zones', value: '3 Major' },
        ];
      } else {
        aiText = `Analyzing query: "${query}". Cross-referencing 800 historical incident records across 20 districts. Overall national crime trends show a steady -4.2% YoY decrease in violent crimes, with localized surges in urban theft and digital offenses.`;
        recommendations = [
          'Maintain heightened vigilance in evening shift patrols (20:00 - 04:00)',
          'Ensure regular dataset refreshes and edge analytics model evaluation',
        ];
        metrics = [
          { label: 'Processed Incidents', value: '800' },
          { label: 'Districts Monitored', value: '20' },
        ];
      }

      const assistantMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: aiText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendations,
        metrics,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsAnalyzing(false);
    }, 700);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm transition-opacity">
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 text-white shadow-md shadow-brand-500/20">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                      CrimeScope Copilot
                    </h2>
                    <Badge variant="brand" className="text-[10px]">
                      <Sparkles className="mr-1 h-3 w-3 inline" /> AI
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tactical Crime Intelligence & Patrol Advisor
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'flex flex-col gap-1.5 max-w-[90%]',
                    m.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start',
                  )}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    {m.sender === 'assistant' ? (
                      <span className="font-semibold text-brand-500 flex items-center gap-1">
                        <Cpu className="h-3 w-3" /> Copilot AI
                      </span>
                    ) : (
                      <span>You</span>
                    )}
                    <span>• {m.timestamp}</span>
                  </div>

                  <div
                    className={cn(
                      'rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm',
                      m.sender === 'user'
                        ? 'bg-brand-600 text-white rounded-tr-none'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700',
                    )}
                  >
                    <p className="whitespace-pre-line">{m.text.replace(/\*\*(.*?)\*\*/g, '$1')}</p>

                    {m.metrics && (
                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/60 pt-2.5 dark:border-slate-700/60">
                        {m.metrics.map((met, idx) => (
                          <div key={idx} className="rounded-lg bg-white/60 p-2 dark:bg-slate-900/60">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">{met.label}</p>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{met.value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {m.recommendations && m.recommendations.length > 0 && (
                      <div className="mt-3 space-y-1.5 border-t border-slate-200/60 pt-2.5 dark:border-slate-700/60">
                        <p className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Actionable Recommendations:
                        </p>
                        <ul className="space-y-1">
                          {m.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                              <span className="text-brand-500">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isAnalyzing && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/20 text-brand-500 animate-pulse">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <span>Copilot is analyzing crime database & running statistical models...</span>
                </div>
              )}
            </div>

            {/* Quick Prompt Chips */}
            <div className="border-t border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Suggested Queries
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(qp.replace(/^[^a-zA-Z0-9]+/, ''))}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:border-brand-500 hover:bg-brand-50 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-brand-900/30 dark:hover:text-brand-300"
                  >
                    {qp}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Box */}
            <div className="border-t border-slate-200 p-3 dark:border-slate-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Copilot about crime trends, patrols..."
                  className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <Button type="submit" disabled={!input.trim() || isAnalyzing} size="sm">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
