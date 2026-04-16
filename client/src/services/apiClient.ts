import axios from "axios";
import { getAccessToken } from "./storage";

function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return "https://devtrails-backend-production.up.railway.app/api/v1";
  }

  return "http://localhost:4000/api/v1";
}

export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl()
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
