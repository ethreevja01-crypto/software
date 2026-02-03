/**
 * Central API Configuration
 * 
 * In production (Vercel), if the frontend is deployed on the same project
 * as the backend, we can use relative paths (/api).
 * 
 * If they are separate, we use the VITE_API_URL environment variable.
 */

const isProduction = import.meta.env.PROD;
const envApiUrl = import.meta.env.VITE_API_URL;

// Default fallbacks
const LOCAL_BACKEND = 'http://localhost:5001';
const VERCEL_BACKEND = 'https://software-rho-three.vercel.app';

export const API_URL = envApiUrl || (isProduction ? '' : LOCAL_BACKEND);

// For features like loyalty that might specifically need the Vercel URL as a fallback
export const FALLBACK_API_URL = VERCEL_BACKEND;

export default API_URL;
