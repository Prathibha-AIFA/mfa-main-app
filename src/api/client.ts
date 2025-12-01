import axios from "axios";

// 🚀 Base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
});

export function setAuthHeader(token: string | null) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

export default api;
