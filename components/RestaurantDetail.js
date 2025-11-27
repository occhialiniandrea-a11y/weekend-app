'use client';

import { useState } from 'react';

export default function RestaurantDetail({ restaurant, onBack, onCreateGroup }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('20:30');
  const [people, setPeople] = useState(4);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState('');

  // Genera data minima (oggi)
  const today = new Date().toISOString().split('T')[0];

  const handleCreateGroup = () => {
    if (!date) {
      alert('Seleziona una data!');
      return;
    }
    if (!groupName.trim()) {
      alert('Inserisci un nome per il gruppo!');
      return;
    }

    const groupData = {
      restaurant: restaurant,
      date: date,
      time: time,
      people: people,
      groupName: groupName,
    };

    onCreateGroup(groupData);
  };

  return (
    <div className="fixed inset-0 bg-white z-[2000] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white shadow-sm p-4 flex items-center gap-3 z-10">
        <button
          onClick={onBack}
          className="text-2xl hover:bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center"
        >
          ←
        </button>
        <h1 className="text-xl font-bold flex-1">{restaurant.name}</h1>
      </div>

      {/* Immagine (placeholder) */}
      <div className="w-full h-64 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-6xl">
        {restaurant.type === 'pizza' && '🍕'}
        {restaurant.type === 'pesce' && '🐟'}
        {restaurant.type === 'carne' && '🥩'}
        {restaurant.type === 'pasta' && '🍝'}
        {restaurant.type === 'street' && '🌮'}
      </div>

      {/* Info base */}
      <div className="p-6 space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{restaurant.name}</h2>
          <p className="text-gray-600 mt-1">{restaurant.description}</p>
        </div>

        {/* Rating e prezzo */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-yellow-500 text-xl">⭐</span>
            <span className="font-semibold">{restaurant.rating}</span>
            <span className="text-gray-500 text-sm">(234 recensioni)</span>
          </div>
          <div className="text-gray-600 font-medium">{restaurant.price}</div>
        </div>

        {/* Dettagli */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-start gap-3">
            <span className="text-xl">📍</span>
            <div>
              <p className="font-medium">Indirizzo</p>
              <p className="text-gray-600">{restaurant.address || 'Via del Porto 23, Rimini'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-xl">📞</span>
            <div>
              <p className="font-medium">Telefono</p>
              <p className="text-gray-600">{restaurant.phone || '+39 0541 123456'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-xl">🕐</span>
            <div>
              <p className="font-medium">Orari</p>
              <p className="text-gray-600">Lun-Dom: 19:00 - 23:00</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-xl">🍽️</span>
            <div>
              <p className="font-medium">Specialità</p>
              <p className="text-gray-600">
                {restaurant.type === 'pesce' && 'Pesce fresco dell\'Adriatico, crudo di mare'}
                {restaurant.type === 'pizza' && 'Pizza napoletana DOC, forno a legna'}
                {restaurant.type === 'carne' && 'Carne alla brace, fiorentina, hamburger gourmet'}
                {restaurant.type === 'pasta' && 'Pasta fatta in casa, piatti tradizionali'}
              </p>
            </div>
          </div>
        </div>

        {/* Configurazione uscita */}
        <div className="pt-6 border-t">
          <h3 className="text-lg font-bold mb-4">📅 Organizza l'uscita</h3>

          <div className="space-y-4">
            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quando?
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={today}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Ora */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                A che ora?
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Numero persone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quante persone? (stima iniziale)
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setPeople(Math.max(1, people - 1))}
                  className="w-12 h-12 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-xl"
                >
                  -
                </button>
                <span className="text-3xl font-bold w-16 text-center">{people}</span>
                <button
                  onClick={() => setPeople(people + 1)}
                  className="w-12 h-12 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-xl"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Crea gruppo o procedi */}
        <div className="pt-6 space-y-3">
          {!showGroupForm ? (
            <>
              <button
                onClick={() => setShowGroupForm(true)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-lg transition-colors"
              >
                👥 Crea gruppo e invita amici
              </button>
              <button
                onClick={() => {
                  if (!date) {
                    alert('Seleziona una data!');
                    return;
                  }
                  alert('Funzionalità "Prenota solo per me" in arrivo!');
                }}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-4 rounded-lg transition-colors"
              >
                🎯 Prenota solo per me
              </button>
            </>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome del gruppo
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Es: Cena del sabato, Uscita amici..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateGroup}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-colors"
                >
                  ✅ Crea gruppo
                </button>
                <button
                  onClick={() => setShowGroupForm(false)}
                  className="px-6 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-3 rounded-lg transition-colors"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}