import axios, {
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import accessToken from "../utils/LocalStorage";

const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
  withCredentials: false,
});

instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = accessToken.getAccessToken();
    if (token) {
      config.headers = AxiosHeaders.from(config.headers || {});
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default instance;








