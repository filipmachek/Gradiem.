import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sun, 
  Moon, 
  MapPin, 
  Search, 
  Navigation, 
  X, 
  RefreshCw
} from 'lucide-react';

export interface WeatherData {
  city: string;
  country: string;
  lat: number;
  lon: number;
  temp: number;
  condition: 'clear' | 'partly-cloudy' | 'cloudy' | 'rain' | 'snow' | 'thunder' | 'fog';
  descriptionEn: string;
  isDay: boolean;
  sunrise: string;
  sunset: string;
  windSpeed: number;
  humidity: number;
}

interface SkyAtmosphereProps {
  theme: 'day' | 'night';
  onLocationChange?: (city: string) => void;
}

const POPULAR_CITIES = [
  { name: 'Prague', country: 'Czech Republic', lat: 50.0755, lon: 14.4378 },
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278 },
  { name: 'New York', country: 'United States', lat: 40.7128, lon: -74.0060 },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503 },
  { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522 },
  { name: 'Berlin', country: 'Germany', lat: 52.5200, lon: 13.4050 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093 },
  { name: 'San Francisco', country: 'United States', lat: 37.7749, lon: -122.4194 },
  { name: 'Vienna', country: 'Austria', lat: 48.2082, lon: 16.3738 },
];

export const SkyAtmosphere: React.FC<SkyAtmosphereProps> = ({ theme }) => {
  // Live time ticker: updates every second
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Saved location
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    country: string;
    lat: number;
    lon: number;
  }>(() => {
    try {
      const saved = localStorage.getItem('dbd_weather_location');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return POPULAR_CITIES[0]; // Prague default
  });

  // Weather state (never null, initialized with default values)
  const [weather, setWeather] = useState<WeatherData>(() => {
    try {
      const cached = localStorage.getItem('dbd_weather_cache');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error(e);
    }
    const isDay = new Date().getHours() >= 6 && new Date().getHours() < 19;
    return {
      city: 'Prague',
      country: 'Czech Republic',
      lat: 50.0755,
      lon: 14.4378,
      temp: isDay ? 20 : 13,
      condition: isDay ? 'clear' : 'clear',
      descriptionEn: isDay ? 'Clear & Sunny' : 'Clear Night',
      isDay,
      sunrise: '06:30',
      sunset: '19:15',
      windSpeed: 10,
      humidity: 60,
    };
  });

  const [loading, setLoading] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ name: string; country: string; admin1?: string; latitude: number; longitude: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Parse WMO code to condition
  const parseWmoCode = (code: number, isDay: boolean): { condition: WeatherData['condition']; en: string } => {
    if (code === 0) {
      return isDay 
        ? { condition: 'clear', en: 'Clear & Sunny' }
        : { condition: 'clear', en: 'Clear Night' };
    }
    if (code === 1 || code === 2) {
      return { condition: 'partly-cloudy', en: 'Partly Cloudy' };
    }
    if (code === 3) {
      return { condition: 'cloudy', en: 'Overcast Clouds' };
    }
    if (code === 45 || code === 48) {
      return { condition: 'fog', en: 'Misty / Foggy' };
    }
    if (code >= 51 && code <= 67) {
      return { condition: 'rain', en: 'Light Rain' };
    }
    if (code >= 71 && code <= 77) {
      return { condition: 'snow', en: 'Snowfall' };
    }
    if (code >= 80 && code <= 82) {
      return { condition: 'rain', en: 'Rain Showers' };
    }
    if (code >= 85 && code <= 86) {
      return { condition: 'snow', en: 'Snow Showers' };
    }
    if (code >= 95) {
      return { condition: 'thunder', en: 'Thunderstorm' };
    }
    return { condition: 'partly-cloudy', en: 'Partly Cloudy' };
  };

  // Fetch weather from Open-Meteo
  const fetchWeather = async (loc = selectedLocation) => {
    try {
      setLoading(true);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,relative_humidity_2m,is_day,weather_code,wind_speed_10m&daily=sunrise,sunset&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Weather fetch failed');
      const data = await res.json();

      const current = data.current;
      const daily = data.daily;

      const isDay = current.is_day === 1;
      const parsed = parseWmoCode(current.weather_code, isDay);

      const sunriseIso = daily?.sunrise?.[0] || '';
      const sunsetIso = daily?.sunset?.[0] || '';
      const sunriseTime = sunriseIso ? sunriseIso.split('T')[1]?.substring(0, 5) : '06:00';
      const sunsetTime = sunsetIso ? sunsetIso.split('T')[1]?.substring(0, 5) : '19:30';

      const weatherObj: WeatherData = {
        city: loc.name,
        country: loc.country,
        lat: loc.lat,
        lon: loc.lon,
        temp: Math.round(current.temperature_2m),
        condition: parsed.condition,
        descriptionEn: parsed.en,
        isDay,
        sunrise: sunriseTime,
        sunset: sunsetTime,
        windSpeed: Math.round(current.wind_speed_10m),
        humidity: Math.round(current.relative_humidity_2m),
      };

      setWeather(weatherObj);
      localStorage.setItem('dbd_weather_cache', JSON.stringify(weatherObj));
      localStorage.setItem('dbd_weather_location', JSON.stringify(loc));
    } catch (err) {
      console.error('Weather load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(selectedLocation);
    const interval = setInterval(() => {
      fetchWeather(selectedLocation);
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedLocation.lat, selectedLocation.lon]);

  // Geocoding search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery.trim())}&count=6&language=en&format=json`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (e) {
        console.error('Geocoding error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // GPS Location handler
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser');
      return;
    }
    setGeoError(null);
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
          let cityName = 'Current Location';
          let countryName = '';
          if (res.ok) {
            const data = await res.json();
            cityName = data.city || data.locality || data.principalSubdivision || 'Current Location';
            countryName = data.countryName || '';
          }
          const newLoc = {
            name: cityName,
            country: countryName,
            lat: latitude,
            lon: longitude,
          };
          setSelectedLocation(newLoc);
          fetchWeather(newLoc);
          setIsLocationModalOpen(false);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        setGeoError('Unable to retrieve location (check browser permissions).');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const isDaytime = weather ? weather.isDay : (now.getHours() >= 6 && now.getHours() < 19);
  const condition = weather?.condition || 'clear';

  // Digital clock time formatting
  const timeFormatted = useMemo(() => {
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const s = now.getSeconds().toString().padStart(2, '0');
    return { h, m, s };
  }, [now]);

  // English Date
  const dateFormatted = useMemo(() => {
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, [now]);

  // Sun / Moon horizontal position (15% to 85%)
  const celestialPositionX = useMemo(() => {
    const hours = now.getHours() + now.getMinutes() / 60;
    if (isDaytime) {
      const dayProgress = Math.min(Math.max((hours - 6) / 13, 0.05), 0.95);
      return Math.round(dayProgress * 70 + 15);
    } else {
      let nightProgress = 0.5;
      if (hours >= 19) {
        nightProgress = (hours - 19) / 11;
      } else {
        nightProgress = (hours + 5) / 11;
      }
      return Math.round(Math.min(Math.max(nightProgress, 0.05), 0.95) * 70 + 15);
    }
  }, [now, isDaytime]);

  return (
    <>
      {/* 
        ========================================================================
        OPEN SKY ATMOSPHERE: SPANNING ACROSS THE ENTIRE TOP OF THE APP
        Vivid and clearly visible in BOTH Day and Night modes!
        Real animated weather (sun, clouds, rain, snow, moon & stars) in the open sky!
        ========================================================================
      */}
      <div className="fixed top-0 left-0 right-0 h-[420px] pointer-events-none select-none overflow-hidden z-0 transition-all duration-1000">
        
        {/* Dynamic Sky Gradient across entire top header */}
        <div 
          className={`absolute inset-0 transition-all duration-1000 ${
            condition === 'thunder'
              ? (isDaytime 
                  ? 'bg-gradient-to-b from-[#2d1b4e]/85 via-[#1b0d2f]/50 via-60% to-transparent'
                  : 'bg-gradient-to-b from-[#1b0d2d]/95 via-[#120722]/65 via-60% to-transparent')
              : condition === 'rain'
              ? (isDaytime 
                  ? 'bg-gradient-to-b from-[#1e293b]/85 via-[#334155]/55 via-60% to-transparent' 
                  : 'bg-gradient-to-b from-[#09131d]/95 via-[#050c12]/65 via-60% to-transparent')
              : condition === 'snow'
              ? (isDaytime 
                  ? 'bg-gradient-to-b from-[#334155]/80 via-[#67e8f9]/35 via-60% to-transparent' 
                  : 'bg-gradient-to-b from-[#0a1520]/95 via-[#070e16]/65 via-60% to-transparent')
              : condition === 'cloudy'
              ? (isDaytime 
                  ? (theme === 'night'
                      ? 'bg-gradient-to-b from-[#2b3e4d]/80 via-[#1c2933]/45 via-60% to-transparent'
                      : 'bg-gradient-to-b from-[#64748b]/70 via-[#94a3b8]/45 via-60% to-transparent')
                  : 'bg-gradient-to-b from-[#0b151f]/95 via-[#070e16]/65 via-60% to-transparent')
              : condition === 'partly-cloudy'
              ? (isDaytime 
                  ? (theme === 'night'
                      ? 'bg-gradient-to-b from-[#16423c]/70 via-[#0f2d29]/40 via-60% to-transparent'
                      : 'bg-gradient-to-b from-[#0284c7]/70 via-[#7dd3fc]/45 via-60% to-transparent')
                  : 'bg-gradient-to-b from-[#051321]/95 via-[#030d17]/65 via-60% to-transparent')
              : isDaytime
              ? (theme === 'night'
                  ? 'bg-gradient-to-b from-[#1b4332]/75 via-[#102a20]/40 via-60% to-transparent'
                  : 'bg-gradient-to-b from-[#0284c7]/75 via-[#38bdf8]/50 via-60% to-transparent') // Vivid daylight azure sky
              : 'bg-gradient-to-b from-[#020617]/95 via-[#071228]/65 via-60% to-transparent' // Deep Midnight Starfield
          }`}
        />

        {/* 1. SLUNÍČKO (Sun): Pure glowing radiant sun orb with pulsing aura (clearly visible in day) */}
        {isDaytime && (condition === 'clear' || condition === 'partly-cloudy') && (
          <div 
            className="absolute transition-all duration-1000 pointer-events-none"
            style={{
              top: '14px',
              left: `${celestialPositionX}%`,
              transform: 'translateX(-50%)',
            }}
          >
            {/* Wide Golden Corona */}
            <div className="w-36 h-36 rounded-full bg-amber-400/50 blur-2xl animate-pulse" />
            {/* Luminous Sun Orb */}
            <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-amber-500 via-amber-300 to-white shadow-[0_0_50px_rgba(251,191,36,1)]" />
          </div>
        )}

        {/* 2. MĚSÍC (Moon): Pure elegant glowing crescent moon (super in night) */}
        {!isDaytime && (condition === 'clear' || condition === 'partly-cloudy') && (
          <div 
            className="absolute transition-all duration-1000 pointer-events-none"
            style={{
              top: '16px',
              left: `${celestialPositionX}%`,
              transform: 'translateX(-50%)',
            }}
          >
            {/* Soft Lunar Glow */}
            <div className="w-28 h-28 rounded-full bg-indigo-300/20 blur-xl animate-pulse" />
            {/* Beautiful Luminous Crescent Moon Path */}
            <div className="absolute inset-3 flex items-center justify-center drop-shadow-[0_0_18px_rgba(224,231,255,0.95)]">
              <svg viewBox="0 0 32 32" className="w-14 h-14" fill="none">
                <path
                  d="M21 4C14.373 4 9 9.373 9 16c0 4.639 2.628 8.664 6.493 10.663C11.465 25.029 8 20.914 8 16 8 9.373 13.373 4 20 4c.677 0 1.343.056 2 .167-.654.557-1.325 1.166-2 1.833z"
                  fill="url(#pureMoonGrad)"
                />
                <defs>
                  <linearGradient id="pureMoonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="60%" stopColor="#E2E8F0" />
                    <stop offset="100%" stopColor="#CBD5E1" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        )}

        {/* 3. HVĚZDY (Stars): Twinkling stars across the top night sky */}
        {!isDaytime && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-90">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white shadow-[0_0_4px_white]"
                style={{
                  width: `${1.5 + (i % 3)}px`,
                  height: `${1.5 + (i % 3)}px`,
                  left: `${(i * 13.7) % 96 + 2}%`,
                  top: `${(i * 19.3) % 240 + 10}px`,
                  animation: `starTwinkle ${1.4 + (i % 3) * 0.6}s ease-in-out infinite`,
                  animationDelay: `${(i * 0.2)}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* 4. MRAKY (Clouds): Shaded, high-contrast fluffy clouds clearly visible in DAY & NIGHT */}
        {(condition === 'cloudy' || condition === 'partly-cloudy') && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Cloud 1 */}
            <div 
              className="absolute top-2 w-64 h-24 rounded-full bg-white/95 dark:bg-white/20 shadow-[0_8px_25px_rgba(15,23,42,0.22)] dark:shadow-none border border-slate-200/70 dark:border-white/10 blur-[1px]"
              style={{
                left: '2%',
                animation: 'cloudDrift 24s ease-in-out infinite',
              }}
            />
            {/* Cloud 2 */}
            <div 
              className="absolute top-10 w-80 h-28 rounded-full bg-white/90 dark:bg-white/25 shadow-[0_10px_30px_rgba(15,23,42,0.24)] dark:shadow-none border border-slate-200/70 dark:border-white/10 blur-[1.5px]"
              style={{
                right: '4%',
                animation: 'cloudDrift 20s ease-in-out infinite reverse',
              }}
            />
            {/* Cloud 3 */}
            <div 
              className="absolute top-20 left-1/4 w-72 h-20 rounded-full bg-white/85 dark:bg-white/15 shadow-[0_6px_20px_rgba(15,23,42,0.18)] dark:shadow-none border border-slate-200/50 dark:border-white/10 blur-[2px]"
              style={{
                animation: 'cloudDrift 28s ease-in-out infinite',
              }}
            />
          </div>
        )}

        {/* 5. PRŠÍ (Rain): Clearly visible falling rain in DAY & NIGHT */}
        {(condition === 'rain' || condition === 'thunder' || condition === 'fog') && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-slate-900/70 dark:from-slate-950/80 to-transparent blur-md" />
            {Array.from({ length: 32 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-[2.5px] h-14 bg-gradient-to-b from-transparent via-blue-600 dark:via-sky-300 to-sky-400 dark:to-white rounded-full shadow-[0_0_3px_rgba(37,99,235,0.9)] dark:shadow-[0_0_2px_rgba(255,255,255,0.7)]"
                style={{
                  left: `${(i * 3.2) % 100}%`,
                  top: `-20px`,
                  animation: `rainFall ${0.5 + (i % 4) * 0.12}s linear infinite`,
                  animationDelay: `${(i * 0.08)}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* 6. SNÍH (Snow): Clearly visible snowflakes in DAY & NIGHT */}
        {condition === 'snow' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 28 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,0.45)] dark:shadow-[0_0_6px_rgba(255,255,255,0.9)] border border-slate-300/60 dark:border-transparent"
                style={{
                  width: `${3.5 + (i % 4)}px`,
                  height: `${3.5 + (i % 4)}px`,
                  left: `${(i * 3.8) % 100}%`,
                  top: `-10px`,
                  animation: `snowDrift ${2.2 + (i % 4) * 0.6}s ease-in-out infinite`,
                  animationDelay: `${(i * 0.2)}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* 7. BOUŘKA (Thunder Flash) */}
        {condition === 'thunder' && (
          <div className="absolute inset-0 pointer-events-none bg-indigo-200/25 mix-blend-overlay animate-pulse" />
        )}
      </div>

      {/* 
        ========================================================================
        CLEAN DIGITAL CLOCK & TEMP/LOCATION PILL (NO WIDGET BOX!)
        Spacious, breathable layout on the open sky!
        ========================================================================
      */}
      <div className="relative z-10 w-full pt-4 pb-3 mb-4 flex flex-col items-center text-center select-none">
        
        {/* Big Digital Clock - Clean typography, crisp contrast in both day and night */}
        <div className="flex items-baseline justify-center gap-2 select-none">
          <span className="text-5xl sm:text-6xl font-mono font-bold tracking-tight theme-ink drop-shadow-sm leading-none">
            {timeFormatted.h}:{timeFormatted.m}
          </span>
          <span className="text-xl sm:text-2xl font-mono font-semibold text-emerald-600 dark:text-emerald-400 leading-none">
            :{timeFormatted.s}
          </span>
        </div>

        {/* Date and Location / Temp Pill (Generously spaced) */}
        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2.5 text-xs sm:text-sm font-medium select-none">
          <span className="theme-muted capitalize tracking-wide">{dateFormatted}</span>

          <span className="theme-muted opacity-40">•</span>

          {/* Clean Temp & Location Pill */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full theme-panel2 border theme-line text-xs font-semibold theme-ink hover:border-emerald-500 active:scale-95 transition-all shadow-xs cursor-pointer select-none"
              title="Click to change location"
            >
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {weather.temp}°C
              </span>
              <span className="theme-muted opacity-40">·</span>
              <span className="theme-muted flex items-center gap-0.5">
                <MapPin className="w-3 h-3 text-emerald-500" />
                {selectedLocation.name}
              </span>
            </button>

            <button
              onClick={() => fetchWeather(selectedLocation)}
              disabled={loading}
              className="p-1.5 rounded-full theme-panel2 border theme-line hover:border-emerald-500 text-muted hover:text-emerald-500 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Refresh live weather"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        MODAL: CHANGE WEATHER LOCATION
        ========================================================================
      */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
          <div className="w-full max-w-md theme-panel rounded-3xl p-5 border-2 theme-line shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base theme-ink">Weather Location</h3>
                  <p className="text-[11px] theme-muted">Sync sky atmosphere with your city</p>
                </div>
              </div>
              <button
                onClick={() => setIsLocationModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 theme-muted hover:theme-ink active:scale-95 transition-transform cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* GPS Location Button */}
            <button
              onClick={handleUseCurrentLocation}
              disabled={loading}
              className="w-full mb-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold text-xs active:scale-98 transition-all cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>Use Current GPS Location</span>
            </button>

            {geoError && (
              <p className="text-xs text-rose-500 mb-2 font-medium">{geoError}</p>
            )}

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search city (e.g. Prague, London, Tokyo)..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--panel2)] border theme-line text-xs theme-ink placeholder-muted focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Search Results */}
            {isSearching && (
              <div className="text-center py-2 text-xs theme-muted">Searching cities...</div>
            )}

            {searchResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1 mb-3">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const newLoc = {
                        name: r.name,
                        country: r.country,
                        lat: r.latitude,
                        lon: r.longitude,
                      };
                      setSelectedLocation(newLoc);
                      fetchWeather(newLoc);
                      setIsLocationModalOpen(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-emerald-500/10 text-xs theme-ink flex items-center justify-between"
                  >
                    <span className="font-semibold">{r.name}</span>
                    <span className="text-[11px] theme-muted">{r.admin1 ? `${r.admin1}, ` : ''}{r.country}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Popular Preset Cities */}
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold theme-muted mb-2">Popular Cities</p>
              <div className="grid grid-cols-3 gap-1.5">
                {POPULAR_CITIES.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => {
                      setSelectedLocation(c);
                      fetchWeather(c);
                      setIsLocationModalOpen(false);
                    }}
                    className={`p-2 rounded-xl text-center text-xs font-semibold transition active:scale-95 border ${
                      selectedLocation.name === c.name
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500'
                        : 'theme-panel2 theme-muted hover:text-ink border-transparent'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
