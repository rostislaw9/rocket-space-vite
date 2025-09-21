import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';

import { isInAppBrowser } from './is-in-app-browser';

export interface ApiResponseMeta {
  requestId: string;
  timestamp: string;
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  limit?: number;
}

export interface ApiResponse<T> {
  data: T;
  meta: ApiResponseMeta;
}

export type ApiAxiosResponse<T> = {
  data: T;
  meta: ApiResponseMeta;
  status: number;
  statusText: string;
  headers: Record<string, unknown>;
  config: AxiosRequestConfig;
};

interface IRequestProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown> | object;
  timeout?: number;
  withAuth?: boolean;
}

/**
 * send() - A generic function to make API requests to the backend.
 * @param {RequestProps} config - Configuration for the request.
 * @returns {Promise<ApiAxiosResponse<T>>} - The response from the backend.
 */

export const send = async <T = unknown,>(
  config: IRequestProps,
  attempt = 1,
): Promise<ApiAxiosResponse<T>> => {
  const {
    method,
    url,
    headers = {},
    query = {},
    body = {},
    timeout = 5000,
    withAuth = true,
  } = config;

  const authHeaders: Record<string, string> = {};
  if (withAuth) {
    const token = localStorage.getItem('token');
    if (token) {
      authHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const finalHeaders = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...headers,
  };

  try {
    const axiosConfig: AxiosRequestConfig = {
      method,
      url: `${import.meta.env.VITE_API_BASE_URL}/api${url}`,
      headers: finalHeaders,
      params: query,
      data: body,
      timeout,
    };

    const response = await axios(axiosConfig);
    return response.data as ApiAxiosResponse<T>;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 && attempt === 1 && isInAppBrowser()) {
        await new Promise((res) => setTimeout(res, 500));
        return send(config, attempt + 1);
      }

      console.error('Axios Error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    } else {
      console.error('Non-Axios Error:', error);
    }

    throw error;
  }
};
