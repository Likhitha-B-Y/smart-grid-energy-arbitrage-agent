import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Bot, User, HelpCircle, Loader2 } from 'lucide-react';
import { AgentChatMessage, HourlyEnergyPoint, OptimizationSummary } from '../types/energy';

interface AiEnergyAdvisorProps {
  isOpen: boolean;
  onClose: () => void;
  currentPoint: HourlyEnergyPoint;
  summary: OptimizationSummary;
  scenarioName: string;
}

export const AiEnergyAdvisor: React.FC<AiEnergyAdvisorProps> = ({
  isOpen,
  onClose,
  currentPoint,
  summary,
  scenarioName,
}) => {
  const [messages, setMessages] = useState<AgentChatMessage[]>([
    {
      id: 'welcome',
      sender: 'agent',
      timestamp: 'Just now',
      text: `Hello! I am your Smart Grid Energy Arbitrage AI Advisor. I monitor your 24-hour solar forecast, battery SOC (${currentPoint.agent.batterySocPct.toFixed(0)}%), and dynamic electricity tariffs.\n\nCurrently, I project $${summary.totalSavingsDollars.toFixed(2)} in net cost savings (${summary.savingsPercentage.toFixed(0)}% lower than baseline). How can I assist with your energy schedule or inverter configuration?`,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!isOpen) return null;

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText.trim();
    if (!textToSend || isLoading) return;

    const userMsg: AgentChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentHour: currentPoint.hour,
          scenarioName,
          totalSavings: summary.totalSavingsDollars,
          savingsPercentage: summary.savingsPercentage,
          batterySoc: currentPoint.agent.batterySocPct,
          currentAction: currentPoint.agent.action,
          solarKw: currentPoint.solarKw,
          demandKw: currentPoint.demandKw,
          currentPrice: currentPoint.importPrice,
          carbonAvoidedKg: summary.netCarbonAvoidedKg,
          userPrompt: textToSend,
        }),
      });

      const data = await response.json();
      const replyText = data.text || 'I analyzed your query. Energy schedules remain within optimal physical constraints.';

      const agentMsg: AgentChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: replyText,
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch {
      const fallbackMsg: AgentChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Analysis: At ${currentPoint.timeLabel}, the optimizer recommends ${currentPoint.agent.action} to minimize tariff costs while preserving a ${currentPoint.agent.batterySocPct.toFixed(0)}% SOC reserve. Expected 24h savings are $${summary.totalSavingsDollars.toFixed(2)}.`,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'Why is the battery holding instead of discharging now?',
    'How does this schedule protect battery health?',
    'What should I do if a storm warning occurs?',
    'Can I charge an electric vehicle cheaply today?',
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-slideLeft">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              Gemini Energy Advisor
            </h3>
            <span className="text-[11px] text-slate-400">
              Grounded in current local optimization state
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Live context pill */}
      <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Time: <strong className="text-slate-200">{currentPoint.timeLabel}</strong></span>
        <span>Action: <strong className="text-emerald-400">{currentPoint.agent.action}</strong></span>
        <span>SOC: <strong className="text-emerald-400">{currentPoint.agent.batterySocPct.toFixed(0)}%</strong></span>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'agent' && (
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-sm'
                  : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700 whitespace-pre-line'
              }`}
            >
              {msg.text}
              <div
                className={`text-[9px] mt-1 ${
                  msg.sender === 'user' ? 'text-emerald-200/80 text-right' : 'text-slate-400'
                }`}
              >
                {msg.timestamp}
              </div>
            </div>
            {msg.sender === 'user' && (
              <div className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs italic">
            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
            <span>Analyzing optimization constraints...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/40">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-emerald-400" />
          <span>Quick Inquiries</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700 text-left transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Message Input Box */}
      <div className="p-3 border-t border-slate-800 bg-slate-950">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask about tariffs, charging, or battery safety..."
            className="flex-1 bg-slate-800 text-white placeholder-slate-500 text-xs px-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
