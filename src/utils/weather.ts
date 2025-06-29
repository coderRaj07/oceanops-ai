import axios from 'axios';
import { WEATHER_API_KEY } from '../config';

export const fetchWeatherForecast = async (location: string) => {
  const res = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
    params: { q: location, appid: WEATHER_API_KEY, units: 'metric' }
  });

  const data = res.data;
  return {
    windSpeed: data.wind?.speed || 0,
    waveHeight: data.main?.pressure ? (1013 - data.main.pressure) / 100 : 1.0 // heuristic
  };
};
