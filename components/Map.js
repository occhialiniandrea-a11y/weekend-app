'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix per le icone di Leaflet in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Componente per aggiornare il centro della mappa dinamicamente
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
}

export default function Map({ location, radius, foodType, searchTriggered, onSelectRestaurant, cachedRestaurants, onRestaurantsLoaded }) {
  const [center, setCenter] = useState([44.0678, 12.5695]); // Centro Romagna (Ravenna)
  const [markers, setMarkers] = useState(cachedRestaurants || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isListCollapsed, setIsListCollapsed] = useState(false);

  // Coordinate di esempio per alcune città
  const cityCoordinates = {
    'rimini': [44.0678, 12.5695],
    'pesaro': [43.9094, 12.9134],
    'cesenatico': [44.1972, 12.4003],
    'ravenna': [44.4184, 12.2035],
    'riccione': [43.9978, 12.6553],
    'fano': [43.8411, 13.0175],
  };

  useEffect(() => {
    if (searchTriggered && location) {
      // Se abbiamo già i risultati in cache, usali senza rifare la chiamata
      if (cachedRestaurants && cachedRestaurants.length > 0) {
        setMarkers(cachedRestaurants);
        // Centra la mappa sul primo risultato
        if (cachedRestaurants[0].position) {
          setCenter(cachedRestaurants[0].position);
        }
        return;
      }

      // Cerca coordinate della città
      const locationLower = location.toLowerCase();
      let coords = null;
      
      for (const [city, cityCoords] of Object.entries(cityCoordinates)) {
        if (locationLower.includes(city)) {
          coords = cityCoords;
          break;
        }
      }

      if (coords) {
        setCenter(coords);
        setMarkers([]); // Reset markers
        setIsLoading(true); // Inizia loading
        
        // Chiama l'API per ottenere ristoranti REALI tramite Claude
        fetch('/api/search-restaurants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            location: location,
            radius: radius,
            foodTypes: foodType,
          }),
        })
          .then(res => res.json())
          .then(data => {
            setIsLoading(false); // Fine loading
            if (data.error) {
              alert('Errore nella ricerca: ' + data.error);
              console.error(data.details);
            } else if (data.restaurants && data.restaurants.length > 0) {
              setMarkers(data.restaurants);
              // Centra sulla prima posizione
              if (data.restaurants[0].position) {
                setCenter(data.restaurants[0].position);
              }
              // Notifica la pagina principale dei risultati
              if (onRestaurantsLoaded) {
                onRestaurantsLoaded(data.restaurants);
              }
            } else {
              alert('Nessun ristorante trovato per i criteri selezionati');
            }
          })
          .catch(error => {
            setIsLoading(false); // Fine loading anche in caso di errore
            console.error('Errore:', error);
            alert('Errore nella ricerca dei ristoranti');
          });
      } else {
        alert('Località non trovata! Prova con: Rimini, Pesaro, Cesenatico, Ravenna, Riccione o Fano');
      }
    }
  }, [searchTriggered, location, foodType, radius, cachedRestaurants, onRestaurantsLoaded]);

  // Icona personalizzata per locali suggeriti (oro)
  const suggestedIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  // Icona normale per altri locali (grigio)
  const normalIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  return (
    <div className="w-full h-full relative">
      {/* Overlay loading */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 z-[1500] flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
          <p className="mt-4 text-lg font-semibold text-gray-700">🔍 Claude sta cercando i migliori locali...</p>
          <p className="text-sm text-gray-500 mt-2">Ricerca sul web in corso</p>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={12}
        className="w-full h-full"
      >
        <MapUpdater center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Cerchio del raggio di ricerca */}
        {searchTriggered && (
          <Circle
            center={center}
            radius={radius * 1000} // converti km in metri
            pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
          />
        )}

        {/* Markers dei ristoranti */}
        {markers.map((restaurant) => (
          <Marker
            key={restaurant.id}
            position={restaurant.position}
            icon={restaurant.suggested ? suggestedIcon : normalIcon}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-lg">
                  {restaurant.suggested && '⭐ '}
                  {restaurant.name}
                </h3>
                <p className="text-sm text-gray-600">{restaurant.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-yellow-500">⭐ {restaurant.rating}</span>
                  <span className="text-gray-500">{restaurant.price}</span>
                </div>
                {restaurant.suggested && (
                  <button 
                    onClick={() => onSelectRestaurant && onSelectRestaurant(restaurant)}
                    className="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-sm w-full hover:bg-blue-600"
                  >
                    🎯 Scegli questo locale
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Suggerimenti in basso - Collassabile */}
      {markers.length > 0 && (
        <div 
          className={`absolute bottom-0 left-0 right-0 bg-white shadow-lg z-[1000] transition-all duration-300 ${
            isListCollapsed ? 'h-14' : 'max-h-80'
          }`}
        >
          {/* Header con bottone collassa */}
          <div 
            className="flex items-center justify-between p-4 border-b cursor-pointer hover:bg-gray-50"
            onClick={() => setIsListCollapsed(!isListCollapsed)}
          >
            <h2 className="font-bold text-lg text-gray-900">
              🌟 Suggeriti per te ({markers.filter(m => m.suggested).length})
            </h2>
            <button 
              className="text-2xl transform transition-transform"
              style={{ transform: isListCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              ▼
            </button>
          </div>

          {/* Lista ristoranti - visibile solo se non collassata */}
          {!isListCollapsed && (
            <div className="overflow-y-auto" style={{ maxHeight: '16rem' }}>
              <div className="space-y-2 p-4">
                {markers.filter(m => m.suggested).map((restaurant) => (
                  <div
                    key={restaurant.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                  >
                    <div className="text-3xl">
                      {restaurant.type === 'pizza' && '🍕'}
                      {restaurant.type === 'pesce' && '🐟'}
                      {restaurant.type === 'carne' && '🥩'}
                      {restaurant.type === 'pasta' && '🍝'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{restaurant.name}</h3>
                      <p className="text-sm text-gray-700">{restaurant.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-yellow-500">⭐ {restaurant.rating}</span>
                        <span className="text-sm text-gray-600">{restaurant.price}</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation(); // Previeni il collasso quando clicco sul bottone
                        onSelectRestaurant && onSelectRestaurant(restaurant);
                      }}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600"
                    >
                      Scegli
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}