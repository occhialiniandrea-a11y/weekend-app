'use client';

import { useState } from 'react';

export default function TelegramNotifications({ botUsername = 'weekend_app_bot' }) {
  const [showInstructions, setShowInstructions] = useState(false);

  const telegramUrl = `https://t.me/${botUsername}`;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="text-3xl">📱</div>
        <div className="flex-1">
          <p className="text-blue-900 font-semibold text-sm mb-1">
            Notifiche Telegram
          </p>
          <p className="text-blue-800 text-xs mb-3">
            Ricevi promemoria settimanali su Telegram (funziona anche su iPhone!)
          </p>
          
          {!showInstructions ? (
            <button
              onClick={() => setShowInstructions(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded text-sm transition-colors"
            >
              ✨ Attiva su Telegram
            </button>
          ) : (
            <div className="bg-white rounded-lg p-3 space-y-3">
              <p className="text-sm font-semibold text-gray-900">Come attivare:</p>
              <ol className="text-xs text-gray-700 space-y-2 list-decimal list-inside">
                <li>Clicca il bottone qui sotto per aprire Telegram</li>
                <li>Manda il comando <code className="bg-gray-100 px-1 py-0.5 rounded">/start</code> al bot</li>
                <li>Riceverai conferma e inizierai a ricevere notifiche!</li>
              </ol>
              
              <div className="flex gap-2">
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded text-sm text-center transition-colors"
                >
                  📱 Apri Telegram Bot
                </a>
                <button
                  onClick={() => setShowInstructions(false)}
                  className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded transition-colors"
                >
                  Chiudi
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}