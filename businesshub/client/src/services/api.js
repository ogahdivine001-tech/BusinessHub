import axios from 'axios';

// Auth is carried entirely via the httpOnly cookie the backend sets on
// login/register, so the JWT is never touched by JS or stored in
// localStorage — that's the whole point of using an httpOnly cookie.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong. Please try again.';
    return Promise.reject(new Error(message));
  }
);

export default api;
