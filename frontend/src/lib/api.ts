import { supabase } from "./supabase";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string
  ) {
    super(`API Error ${status}: ${body}`);
  }
}

class ApiClient {
  private baseUrl = "/api";

  private async getHeaders(): Promise<HeadersInit> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    return headers;
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: await this.getHeaders(),
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json();
  }

  async post<T>(path: string, body: Record<string, unknown>, options?: { stepUpToken?: string }): Promise<T> {
    const headers = await this.getHeaders() as Record<string, string>;
    if (options?.stepUpToken) headers["X-Step-Up-Token"] = options.stepUpToken;
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  async postPublic<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  async patch<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "PATCH",
      headers: await this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json();
  }

  async put<T>(path: string, body: Record<string, unknown>, options?: { stepUpToken?: string }): Promise<T> {
    const headers = await this.getHeaders() as Record<string, string>;
    if (options?.stepUpToken) headers["X-Step-Up-Token"] = options.stepUpToken;
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  async getPublic<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json();
  }

  async delete(path: string, options?: { stepUpToken?: string }): Promise<void> {
    const headers = await this.getHeaders() as Record<string, string>;
    if (options?.stepUpToken) headers["X-Step-Up-Token"] = options.stepUpToken;
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "DELETE",
      headers,
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
  }
}

export const api = new ApiClient();
