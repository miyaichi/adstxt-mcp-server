/**
 * API client for Ads.txt Manager backend
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type { ApiResponse, ApiError } from '../types/index.js';

export class ApiClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private timeout: number;
  private retries: number;

  constructor() {
    this.baseUrl = process.env.API_BASE_URL || 'https://adstxt-manager.jp';
    this.timeout = parseInt(process.env.API_TIMEOUT || '30000', 10);
    this.retries = parseInt(process.env.API_RETRIES || '3', 10);

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'adstxt-mcp-server/0.1.0',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.config && this.shouldRetry(error)) {
          const retryCount = (error.config as any).__retryCount || 0;
          if (retryCount < this.retries) {
            (error.config as any).__retryCount = retryCount + 1;
            await this.delay(Math.pow(2, retryCount) * 1000);
            return this.client(error.config);
          }
        }
        throw error;
      }
    );
  }

  private shouldRetry(error: AxiosError): boolean {
    return (
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT' ||
      (error.response?.status !== undefined && error.response.status >= 500)
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private handleError(error: unknown): ApiError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: { code?: string; message?: string } }>;

      if (axiosError.response) {
        return {
          code: axiosError.response.data?.error?.code || 'SERVER_ERROR',
          message: axiosError.response.data?.error?.message || axiosError.message,
          details: axiosError.response.data,
        };
      } else if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
        return {
          code: 'TIMEOUT',
          message: 'Request timeout',
          details: { timeout: this.timeout },
        };
      } else {
        return {
          code: 'NETWORK_ERROR',
          message: axiosError.message,
        };
      }
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<ApiResponse<T>>(path);
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error),
      };
    }
  }

  async post<T>(path: string, data?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<ApiResponse<T>>(path, data);
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error),
      };
    }
  }

  async getRaw(path: string): Promise<string> {
    try {
      const response = await this.client.get(path, {
        responseType: 'text',
        transformResponse: [(data) => data],
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

export const apiClient = new ApiClient();
