'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import RestaurantDetail from '../components/RestaurantDetail';
import NotificationManager from '../components/NotificationManager';
import TelegramNotifications from '../components/TelegramNotifications';

// Importiamo la mappa dinamicamente per evitare errori SSR
const Map = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center">Caricamento mappa...</div>
});

export default function Home() {
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState(10);
  const [foodType, setFoodType] = useState([]);
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [cachedRestaurants, setCachedRestaurants] = useState(null); // Cache risultati
  const [showShareMessage, setShowShareMessage] = useState(false);
  const [voteSessionId, setVoteSessionId] = useState(null);
  const [creatingSession, setCreatingSession] = useState(false);

  const foodOptions = [
    { id: 'pizza', label: '🍕 Pizza' },
    { id: 'carne', label: '🥩 Carne' },
    { id: 'pesce', label: '🐟 Pesce' },
    { id: 'pasta', label: '🍝 Pasta/Tradizionale' },
    { id: 'street', label: '🌮 Street Food' },
  ];

  const toggleFoodType = (id) => {
    if (id === 'misto') {
      // Se clicco "Misto", seleziono tutto o deseleziono tutto
      if (foodType.length === foodOptions.length) {
        setFoodType([]);
      } else {
        setFoodType(foodOptions.map(f => f.id));
      }
    } else {
      // Toggle singola categoria
      if (foodType.includes(id)) {
        setFoodType(foodType.filter(f => f !== id));
      } else {
        setFoodType([...foodType, id]);
      }
    }
  };

  const handleSearch = () => {
    if (location && foodType.length > 0) {
      setCachedRestaurants(null); // Reset cache per nuova ricerca
      setVoteSessionId(null); // Reset sessione per nuova ricerca
      setSearchTriggered(true);
    } else {
      alert('Inserisci una località e scegli almeno un tipo di cibo!');
    }
  };

  const handleSelectRestaurant = (restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  const handleCreateGroup = (groupData) => {
    setCurrentGroup(groupData);
    alert(`Gruppo "${groupData.groupName}" creato! Ora implementeremo la votazione.`);
    // Per ora torniamo indietro
    setSelectedRestaurant(null);
  };

  const handleRestaurantsLoaded = (restaurants) => {
    setCachedRestaurants(restaurants);
  };

  const generateShareMessage = () => {
    if (!cachedRestaurants || cachedRestaurants.length === 0) {
      return '';
    }

    const emojis = {
      pizza: '🍕',
      pesce: '🐟',
      carne: '🥩',
      pasta: '🍝',
      street: '🌮'
    };

    let message = `🍽️ PROPOSTE WEEKEND 🎉\n\n`;
    message += `Ciao gruppo! Ho trovato ${cachedRestaurants.length} locali fantastici a ${location}:\n\n`;

    cachedRestaurants.forEach((resto, index) => {
      const emoji = emojis[resto.type] || '🍽️';
      message += `${index + 1}. ${emoji} ${resto.name} ⭐${resto.rating} (${resto.price})\n`;
      message += `   📍 ${resto.address}\n`;
      message += `   🔗 ${resto.googleMapsUrl}\n\n`;
    });

    if (voteSessionId) {
      message += `\n📊 VOTA IL TUO PREFERITO:\n`;
      message += `${window.location.origin}/vote/${voteSessionId}\n\n`;
    }

    message += `Buon appetito! 🍽️`;

    return message;
  };

  const copyToClipboard = async () => {
    const message = generateShareMessage();
    try {
      await navigator.clipboard.writeText(message);
      alert('✅ Messaggio copiato! Ora incollalo su WhatsApp o Telegram');
      setShowShareMessage(false);
    } catch (err) {
      // Fallback per browser che non supportano clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = message;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('✅ Messaggio copiato! Ora incollalo su WhatsApp o Telegram');
      setShowShareMessage(false);
    }
  };

  const handleOpenShareModal = async () => {
    setShowShareMessage(true);
    
    // Crea automaticamente la sessione se non esiste già
    if (!voteSessionId && cachedRestaurants && cachedRestaurants.length > 0) {
      setCreatingSession(true);
      
      try {
        const response = await fetch('/api/create-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            restaurants: cachedRestaurants,
            location: location,
            groupName: 'Weekend a ' + location,
            createdBy: 'Admin',
            deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 giorni da ora,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setVoteSessionId(data.sessionId);
        }
      } catch (error) {
        console.error('Errore creazione sessione:', error);
      } finally {
        setCreatingSession(false);
      }
    }
  };

  // Se c'è un ristorante selezionato, mostra il dettaglio
  if (selectedRestaurant) {
    return (
      <RestaurantDetail
        restaurant={selectedRestaurant}
        onBack={() => setSelectedRestaurant(null)}
        onCreateGroup={handleCreateGroup}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header - Compatto */}
      <header className="bg-white shadow-sm py-2 px-4 z-10">
        <h1 className="text-xl font-bold text-gray-800 text-center">Weekend App 🎉</h1>
      </header>

      {/* Filtri - Compatti */}
      <div className="bg-white px-4 py-3 shadow-md space-y-2">
        {/* Notifiche Push Web (Desktop + Android) */}
        <NotificationManager />
        
        {/* Notifiche Telegram (Mobile: iOS + Android) */}
        <TelegramNotifications botUsername="Weekend_Patroclo_bot" />

        {/* Località e Raggio sulla stessa riga */}
        <div className="flex gap-3">
          {/* Località */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              📍 Dove cerchi?
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Es: Rimini, Pesaro..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 text-gray-900"
            />
          </div>

          {/* Raggio */}
          <div className="w-32">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              📏 Raggio: {radius}km
            </label>
            <input
              type="range"
              min="5"
              max="30"
              step="5"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2"
            />
          </div>
        </div>

        {/* Tipo di cibo - più compatto */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            🍽️ Che tipo di cibo?
          </label>
          
          {/* Bottone Misto - più piccolo */}
          <button
            onClick={() => toggleFoodType('misto')}
            className={`w-full mb-2 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              foodType.length === foodOptions.length
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ✨ Misto
          </button>

          {/* Bottoni categorie singole - più piccoli */}
          <div className="grid grid-cols-3 gap-1.5">
            {foodOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => toggleFoodType(option.id)}
                className={`px-2 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  foodType.includes(option.id)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottone Cerca - più piccolo */}
        <button
          onClick={handleSearch}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 text-sm rounded-lg transition-colors"
        >
          🔍 Cerca locali
        </button>
      </div>

      {/* Mappa */}
      <div className="flex-1 relative">
        {/* Bottone Condividi - Flottante sopra la mappa */}
        {cachedRestaurants && cachedRestaurants.length > 0 && !showShareMessage && (
          <button
            onClick={handleOpenShareModal}
            className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1001] bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-all flex items-center gap-2"
          >
            📱 Condividi proposte su WhatsApp
          </button>
        )}

        {/* Modale messaggio da copiare */}
        {showShareMessage && (
          <div className="absolute inset-0 bg-black bg-opacity-50 z-[1002] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6 space-y-4">
                <h2 className="text-xl font-bold text-gray-900">📱 Messaggio da condividere</h2>
                
                {/* Stato creazione sessione */}
                {creatingSession && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      <p className="text-sm text-gray-700">
                        Creazione sessione di voto...
                      </p>
                    </div>
                  </div>
                )}

                {/* Conferma sessione creata */}
                {voteSessionId && !creatingSession && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-semibold flex items-center gap-2">
                      ✅ Sessione di voto attiva!
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      I tuoi amici potranno votare cliccando sul link nel messaggio.
                    </p>
                  </div>
                )}
                
                <div className="bg-gray-50 p-4 rounded border border-gray-300 max-h-96 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap font-sans text-gray-800">{generateShareMessage()}</pre>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    disabled={creatingSession}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait"
                  >
                    {creatingSession ? 'Preparazione...' : '📋 Copia messaggio'}
                  </button>
                  <button
                    onClick={() => {
                      setShowShareMessage(false);
                      // Non resettiamo voteSessionId subito, così l'utente può riaprire e riusare lo stesso link
                    }}
                    className="px-6 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-3 rounded-lg transition-colors"
                  >
                    Chiudi
                  </button>
                </div>

                <p className="text-xs text-gray-600 text-center">
                  {voteSessionId 
                    ? '🗳️ Il messaggio include il link per votare. I tuoi amici potranno anche vedere foto e recensioni su Google Maps!' 
                    : 'I tuoi amici potranno cliccare sui link per vedere foto e recensioni su Google Maps!'}
                </p>
              </div>
            </div>
          </div>
        )}

        <Map 
          location={location}
          radius={radius}
          foodType={foodType}
          searchTriggered={searchTriggered}
          onSelectRestaurant={handleSelectRestaurant}
          cachedRestaurants={cachedRestaurants}
          onRestaurantsLoaded={handleRestaurantsLoaded}
        />
      </div>
    </div>
  );
}