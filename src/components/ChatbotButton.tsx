import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth-context';

export const ChatbotButton: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuth();
  const { t } = useTranslation('common');
  const [showTooltip, setShowTooltip] = useState(false);
  const targetRoute = role === 'patient' ? '/patient/ai-chat' : '/ai-chat';

  // Don't show the button if we're already on either AI chat page.
  if (location.pathname === '/ai-chat' || location.pathname === '/patient/ai-chat') {
    return null;
  }

  const handleClick = () => {
    navigate(targetRoute);
  };

  return (
    <>
      {/* Floating chatbot button */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute bottom-full right-0 mb-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap animate-fade-in">
              {t('chatbot.tooltip', { defaultValue: 'Chat with AI Health Assistant' })}
              <div className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
            </div>
          )}

          {/* Main button */}
          <button
            type="button"
            onClick={handleClick}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="group relative bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full p-4 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300"
            aria-label={t('chatbot.ariaOpen', { defaultValue: 'Open AI Health Assistant' })}
          >
            {/* Pulse animation ring */}
            <div className="absolute inset-0 rounded-full bg-blue-600 animate-ping opacity-20"></div>

            {/* Icon */}
            <div className="relative">
              <MessageCircle className="w-6 h-6" />

              {/* Online indicator dot */}
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
            </div>
          </button>

          {/* Badge for new feature */}
          <div className="absolute -top-2 -left-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-bounce">
            AI
          </div>
        </div>
      </div>

      {/* Add animation styles */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
};
