export async function POST(request) {
  try {
    const { location, radius, foodTypes } = await request.json();

    if (!location || !foodTypes || foodTypes.length === 0) {
      return Response.json(
        { error: 'Location e tipo di cibo sono obbligatori' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      console.error('GOOGLE_PLACES_API_KEY non trovata nel file .env.local');
      return Response.json(
        { error: 'Configurazione API mancante' },
        { status: 500 }
      );
    }

    // Step 1: Geocodifica la località per ottenere coordinate precise
    const geocodeResponse = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`
    );

    if (!geocodeResponse.ok) {
      return Response.json(
        { error: 'Errore nella geocodifica della località' },
        { status: 500 }
      );
    }

    const geocodeData = await geocodeResponse.json();
    
    if (!geocodeData.results || geocodeData.results.length === 0) {
      return Response.json(
        { error: `Località "${location}" non trovata` },
        { status: 404 }
      );
    }

    const locationCoords = geocodeData.results[0].geometry.location;
    console.log(`Coordinate di ${location}:`, locationCoords);

    // Mappa i tipi di cibo a query testuali per Google
    const foodTypeMap = {
      'pizza': 'pizzeria',
      'pesce': 'ristorante pesce',
      'carne': 'steakhouse braceria',
      'pasta': 'ristorante tradizionale',
      'street': 'street food'
    };

    // Se è misto, cerchiamo "ristoranti"
    const isMixed = foodTypes.length > 2;
    const searchQuery = isMixed 
      ? `ristoranti a ${location}`
      : `${foodTypes.map(t => foodTypeMap[t] || t).join(' ')} a ${location}`;

    console.log('Cercando:', searchQuery);

    // Step 2: Chiama Google Places API (New) - Text Search con coordinate precise
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.nationalPhoneNumber,places.types'
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        languageCode: 'it',
        maxResultCount: 20, // Chiedo 20 per averne abbastanza da filtrare
        locationBias: {
          circle: {
            center: {
              latitude: locationCoords.lat,
              longitude: locationCoords.lng
            },
            radius: radius * 1000 // converti km in metri - ORA USA IL VERO RAGGIO!
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Errore Google Places:', response.status, errorText);
      return Response.json(
        { error: `Errore Google Places: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (!data.places || data.places.length === 0) {
      return Response.json(
        { error: 'Nessun ristorante trovato' },
        { status: 404 }
      );
    }

    // Ottieni place_id per ogni locale (serve per i link Google Maps)
    const placesWithIds = await Promise.all(
      data.places.slice(0, 8).map(async (place) => {
        // Cerca il place_id usando il nome e indirizzo
        const detailQuery = encodeURIComponent(`${place.displayName?.text} ${place.formattedAddress}`);
        const detailResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${detailQuery}&inputtype=textquery&fields=place_id&key=${apiKey}`
        );
        
        let placeId = null;
        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          if (detailData.candidates && detailData.candidates.length > 0) {
            placeId = detailData.candidates[0].place_id;
          }
        }
        
        return { ...place, place_id: placeId };
      })
    );

    // Mappa i risultati al formato della nostra app
    const restaurants = placesWithIds.map((place, index) => {
      // Determina il tipo in base ai types di Google
      let type = 'pasta'; // default
      if (place.types) {
        if (place.types.includes('pizza_restaurant')) type = 'pizza';
        else if (place.types.includes('seafood_restaurant')) type = 'pesce';
        else if (place.types.includes('steak_house') || place.types.includes('barbecue_restaurant')) type = 'carne';
      }

      // Converti priceLevel di Google (0-4) in nostro formato
      let price = '€€';
      if (place.priceLevel === 'PRICE_LEVEL_INEXPENSIVE') price = '€';
      else if (place.priceLevel === 'PRICE_LEVEL_MODERATE') price = '€€';
      else if (place.priceLevel === 'PRICE_LEVEL_EXPENSIVE') price = '€€€';
      else if (place.priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE') price = '€€€€';

      return {
        id: index + 1,
        name: place.displayName?.text || 'Ristorante',
        type: type,
        position: [place.location?.latitude || 44.0678, place.location?.longitude || 12.5695],
        rating: place.rating || 4.0,
        price: price,
        description: `Ristorante ${type} a ${location}`,
        address: place.formattedAddress || 'Indirizzo non disponibile',
        phone: place.nationalPhoneNumber || 'Telefono non disponibile',
        suggested: true,
        placeId: place.place_id,
        googleMapsUrl: place.place_id 
          ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName?.text || '')}`
      };
    });

    console.log(`Trovati ${restaurants.length} ristoranti`);

    return Response.json({ restaurants });

  } catch (error) {
    console.error('Errore API:', error);
    return Response.json(
      { error: 'Errore nella ricerca', details: error.message },
      { status: 500 }
    );
  }
}