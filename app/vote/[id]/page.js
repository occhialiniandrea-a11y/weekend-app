'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function VotePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id;

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    // Genera o recupera userId dal localStorage
    let storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      storedUserId = 'user_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('userId', storedUserId);
    }
    setUserId(storedUserId);

    // Recupera nome se già salvato
    const storedName = localStorage.getItem('userName');
    if (storedName) {
      setUserName(storedName);
    }

    // Carica sessione
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const response = await fetch(`/api/vote/${sessionId}`);
      if (!response.ok) {
        throw new Error('Sessione non trovata');
      }
      const data = await response.json();
      setSession(data.session);
      
      // Controlla se l'utente ha già votato
      if (data.session.votes[userId]) {
        setHasVoted(true);
        setSelectedRestaurant(data.session.votes[userId]);
      }
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleVote = async (restaurantId) => {
    if (!userName.trim()) {
      alert('Inserisci il tuo nome prima di votare!');
      return;
    }

    // Salva nome nel localStorage
    localStorage.setItem('userName', userName);

    try {
      const response = await fetch(`/api/vote/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          userName: userName,
          restaurantId: restaurantId,
        }),
      });

      if (!response.ok) {
        throw new Error('Errore nel voto');
      }

      const data = await response.json();
      
      // Aggiorna stato locale
      setHasVoted(true);
      setSelectedRestaurant(restaurantId);
      
      // Aggiorna conteggio voti
      setSession(prev => ({
        ...prev,
        voteCounts: data.voteCounts,
        totalVoters: data.totalVoters,
      }));

      alert('✅ Voto registrato!');
    } catch (err) {
      alert('Errore nel voto: ' + err.message);
    }
  };

  const getWinner = () => {
    if (!session || !session.voteCounts) return null;
    
    let maxVotes = 0;
    let winner = null;
    
    Object.entries(session.voteCounts).forEach(([restaurantId, votes]) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        winner = session.restaurants.find(r => r.id === parseInt(restaurantId));
      }
    });
    
    return { restaurant: winner, votes: maxVotes };
  };

  const emojis = {
    pizza: '🍕',
    pesce: '🐟',
    carne: '🥩',
    pasta: '🍝',
    street: '🌮'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sessione non trovata</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const winner = getWinner();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm py-4 px-4">
        <h1 className="text-2xl font-bold text-gray-800 text-center">
          🗳️ {session.groupName}
        </h1>
        <p className="text-center text-gray-600 text-sm mt-1">
          {session.location}
        </p>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Info sessione */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">👥 Votanti</p>
              <p className="text-2xl font-bold text-gray-900">{session.totalVoters}</p>
            </div>
            {session.deadline && (
              <div className="text-right">
                <p className="text-sm text-gray-600">⏰ Deadline</p>
                <p className="font-semibold text-gray-900">
                  {new Date(session.deadline).toLocaleDateString('it-IT')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Input nome se non ha ancora votato */}
        {!hasVoted && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              👤 Il tuo nome
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Es: Marco"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
        )}

        {/* Messaggio se ha votato */}
        {hasVoted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-green-800 font-semibold">
              ✅ Hai votato! Puoi cambiare idea votando di nuovo.
            </p>
          </div>
        )}

        {/* Toggle risultati */}
        <button
          onClick={() => setShowResults(!showResults)}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-lg transition-colors"
        >
          {showResults ? '👁️ Nascondi risultati' : '📊 Mostra risultati'}
        </button>

        {/* Risultati */}
        {showResults && winner.restaurant && (
          <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 border-2 border-yellow-400 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 text-center">
              🏆 Locale in testa
            </h2>
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{emojis[winner.restaurant.type]}</span>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900">{winner.restaurant.name}</h3>
                  <p className="text-sm text-gray-600">{winner.restaurant.address}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-yellow-600">{winner.votes}</p>
                  <p className="text-sm text-gray-600">voti</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista ristoranti */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900">
            {hasVoted ? 'Puoi cambiare il tuo voto' : 'Vota il tuo preferito'}
          </h2>
          
          {session.restaurants.map((restaurant) => {
            const votes = session.voteCounts[restaurant.id] || 0;
            const isSelected = selectedRestaurant === restaurant.id;
            
            return (
              <div
                key={restaurant.id}
                className={`bg-white rounded-lg shadow hover:shadow-lg transition-all border-2 ${
                  isSelected ? 'border-blue-500' : 'border-transparent'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{emojis[restaurant.type]}</span>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900">{restaurant.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{restaurant.address}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm text-yellow-500">⭐ {restaurant.rating}</span>
                        <span className="text-sm text-gray-500">{restaurant.price}</span>
                        {showResults && (
                          <span className="text-sm font-semibold text-blue-600">
                            {votes} {votes === 1 ? 'voto' : 'voti'}
                          </span>
                        )}
                      </div>
                      <a
                        href={restaurant.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline mt-2 inline-block"
                      >
                        🔗 Vedi su Google Maps
                      </a>
                    </div>
                    <button
                      onClick={() => handleVote(restaurant.id)}
                      disabled={!userName.trim()}
                      className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                        isSelected
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isSelected ? '✓ Votato' : 'Vota'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}