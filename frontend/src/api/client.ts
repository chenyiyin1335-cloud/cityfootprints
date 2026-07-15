// 部署到 Vercel + Render 时，前后端不在同一个域名下，需要通过环境变量告诉前端后端地址。
// 本地开发不用配置，Vite 代理会自动把 /api 转发到 127.0.0.1:8000。
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

// 拼接图片等静态资源地址（后端返回的是相对路径 /uploads/xxx.jpg）
export function resolveAssetUrl(path?: string | null): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path}`;
}

const TOKEN_KEY = "footprint_map_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export interface User {
  id: number;
  username: string;
  nickname?: string;
  avatar_url?: string;
  is_admin: boolean;
}

export interface Shop {
  id: number;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  address?: string;
  city_code?: string;
  cover_image?: string;
  check_in_count: number;
  created_at: string;
  is_checked_in: boolean;
}

export interface CheckIn {
  id: number;
  user_id: number;
  shop_id: number;
  images: string[];
  rating?: number;
  comment?: string;
  created_at: string;
  shop_name?: string;
  username?: string;
}

export interface ShopDetail extends Shop {
  recent_check_ins: CheckIn[];
}

export interface UserStats {
  total_check_ins: number;
  city_count: number;
  favorite_category?: string;
  category_breakdown: Record<string, number>;
}

class ApiError extends Error {
  detail: any;
  constructor(detail: any) {
    super(typeof detail === "string" ? detail : JSON.stringify(detail));
    this.detail = detail;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(body.detail);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export const api = {
  register: (username: string, password: string, nickname?: string) =>
    request<{ access_token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password, nickname }),
    }),

  login: (username: string, password: string) =>
    request<{ access_token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  me: () => request<User>("/api/auth/me"),

  listShops: (params: { category?: string; keyword?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.category && params.category !== "all") qs.set("category", params.category);
    if (params.keyword) qs.set("keyword", params.keyword);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<Shop[]>(`/api/shops${suffix}`);
  },

  getShop: (id: number) => request<ShopDetail>(`/api/shops/${id}`),

  checkIn: (payload: {
    shop_id: number;
    lat: number;
    lng: number;
    images?: string[];
    rating?: number;
    comment?: string;
  }) =>
    request<CheckIn>("/api/check-ins", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  myCheckIns: () => request<CheckIn[]>("/api/check-ins/mine"),

  deleteCheckIn: (id: number) =>
    request<{ success: boolean }>(`/api/check-ins/${id}`, { method: "DELETE" }),

  myStats: () => request<UserStats>("/api/users/me/stats"),

  uploadImage: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ url: string }>("/api/check-ins/upload-image", {
      method: "POST",
      body: form,
    });
  },
};

export { ApiError };
