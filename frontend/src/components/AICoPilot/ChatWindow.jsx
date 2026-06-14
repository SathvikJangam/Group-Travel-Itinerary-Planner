// client/src/components/AICoPilot/ChatWindow.jsx
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

export default function ChatWindow({ tripId }) {
  // Initial greeting message
  const [messages, setMessages] = useState([
    { 
      role: 'ai', 
      text: "Hi! I'm your Trip Co-Pilot. I can see your itinerary! Ask me for food recommendations, travel times, or spot suggestions." 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Ref to automatically scroll to the newest message
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    
    // 1. Instantly add user's message to the UI
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsTyping(true);

    try {
      // 2. Call the backend AI controller
      const { data } = await axios.post(`/ai/${tripId}/chat`, { userMessage });
      
      // 3. Add AI's response to the UI
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: "Sorry, my servers are currently resting. Please try again in a moment." 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="w-96 bg-apple-surface border-l border-white/10 flex flex-col h-screen">
      
      {/* Header */}
      <div className="p-6 border-b border-white/10 bg-apple-surface/50 backdrop-blur-md">
        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
          <span className="text-2xl animate-pulse">✨</span> Trip Co-Pilot
        </h2>
        <p className="text-xs text-apple-gray mt-1">Powered by Gemini 2.5 Flash</p>
      </div>
      
      {/* Scrollable Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-[#0a0a0c]">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-apple-blue text-white rounded-br-sm' 
                  : 'bg-apple-surfaceHover text-apple-lightText border border-white/5 rounded-bl-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-apple-surfaceHover border border-white/5 p-4 rounded-2xl rounded-bl-sm flex gap-2 items-center">
              <div className="w-2 h-2 bg-apple-gray rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-apple-gray rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-apple-gray rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="p-4 border-t border-white/10 bg-apple-surface">
        <form onSubmit={handleSendMessage} className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for suggestions..." 
            disabled={isTyping}
            className="w-full p-4 pr-12 bg-apple-black border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-apple-blue focus:ring-1 focus:ring-apple-blue transition-all disabled:opacity-50"
          />
          <button 
            type="submit"
            disabled={isTyping || !input.trim()}
            className="absolute right-2 top-2 p-2 bg-apple-blue text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>

    </div>
  );
}