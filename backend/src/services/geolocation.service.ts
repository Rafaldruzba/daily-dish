import axios from 'axios';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

export async function geocodeCity(city: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const response = await axios.get<NominatimResult[]>('https://nominatim.openstreetmap.org/search', {
      params: {
        q: city,
        format: 'json',
        limit: 1,
        email: 'rafaldruzba.00@gmail.com', // nominatim policy: provide contact email
      },
      headers: {
        'User-Agent': 'DailyDishLocatorAppSystemLodzGastronomy/2.0 (contact: rafaldruzba.00@gmail.com)', // unique identifier
      },
    });

    if (response.data && response.data.length > 0) {
      const { lat, lon } = response.data[0];
      return { lat: parseFloat(lat), lon: parseFloat(lon) };
    }
    return null;
  } catch (error) {
    console.error(`Geocoding error for city "${city}":`, error);
    return null;
  }
}
