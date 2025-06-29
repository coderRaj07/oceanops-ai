import dotenv from 'dotenv';
dotenv.config();
export const WEATHER_API_KEY = process.env.WEATHER_API_KEY || '';
export const MONGO_URI = process.env.MONGO_URI || '';
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''