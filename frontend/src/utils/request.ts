import axios, { type AxiosInstance } from 'axios';
import { ElMessage } from 'element-plus';
import type { MessageType } from '@/types';

const request: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 60000,
});

request.interceptors.response.use(
  (response) => response.data,
  (error: { response?: { data?: { error?: string } }; message?: string }) => {
    const message =
      error.response?.data?.error ||
      error.message ||
      '请求失败';
    return Promise.reject(new Error(message));
  },
);

export default request;

export function showMessage(message: string, type: MessageType = 'success'): void {
  ElMessage({ message, type: type === 'danger' ? 'error' : type });
}
