import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

export const api = axios.create({ baseURL, withCredentials: true });

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("aryoga_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear auth state and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("aryoga_auth");
      localStorage.removeItem("aryoga_token");
      // Only redirect if not already on login page
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
