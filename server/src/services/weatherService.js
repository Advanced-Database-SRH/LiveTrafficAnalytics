const WEATHER_TTL_MS = 10 * 60 * 1000; 

const cache = { data: null, fetchedAt: 0 };

const CAM_LAT = parseFloat(process.env.CAM_LAT ?? '48.8566');
const CAM_LON = parseFloat(process.env.CAM_LON ?? '2.3522');

function decodeWeatherCode(code) {
    if (code === 0)   
        return 'clear sky';
    if (code <= 2)    
        return 'partly cloudy';
    if (code === 3)   
        return 'overcast';
    if (code <= 49)   
        return 'foggy';
    if (code <= 57)   
        return 'drizzle';
    if (code <= 67)  
        return 'rainy';
    if (code <= 77)   
        return 'snowy';
    if (code <= 82)   
        return 'rain showers';
    if (code <= 86)   
        return 'snow showers';
    if (code <= 99)   
        return 'thunderstorm';
    return 'unknown';
}

async function getCurrentWeather() {
    const now = Date.now();

    if (cache.data && now - cache.fetchedAt < WEATHER_TTL_MS) {
        return cache.data;
    }

    try {
        const url =
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${CAM_LAT}&longitude=${CAM_LON}` +
            `&current=temperature_2m,weathercode,windspeed_10m,precipitation` +
            `&timezone=auto`;

        const res  = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        const c    = json.current;

        cache.data = {
            temperature_c: c.temperature_2m,
            wind_speed_kmh: c.windspeed_10m,
            precipitation: c.precipitation,
            condition: decodeWeatherCode(c.weathercode),
            code: c.weathercode,
        };
        cache.fetchedAt = now;

        return cache.data;

    } catch (err) {
        console.warn('[WeatherService] Fetch failed, returning unknown:', err.message);
        return {
            temperature_c:  null,
            wind_speed_kmh: null,
            precipitation:  null,
            condition:      'unknown',
            code:           -1,
        };
    }
}

module.exports = { getCurrentWeather };