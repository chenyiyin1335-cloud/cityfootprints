import { supabase } from '../supabase'

const TOKEN_KEY = "footprint_map_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export interface User {
  id: string;
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
  user_id: string;
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

export const api = {
  register: async (username: string, password: string, nickname?: string) => {
    const email = `${username}@example.com`;
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          username: username,
          nickname: nickname || username,
        },
      },
    });
    if (error) {
      if (error.message.includes('already registered')) {
        throw new ApiError('该用户名已被注册');
      }
      throw new ApiError(error.message);
    }
    const token = data.session?.access_token;
    if (token) setToken(token);
    return {
      access_token: token || "",
      user: { 
        id: data.user?.id || "", 
        username, 
        nickname: nickname || username, 
        is_admin: false 
      }
    };
  },

  login: async (username: string, password: string) => {
    const email = `${username}@example.com`;
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    if (error) throw new ApiError(error.message);
    const token = data.session?.access_token;
    if (token) setToken(token);
    return {
      access_token: token || "",
      user: { id: data.user?.id || "", username, nickname: username, is_admin: false }
    };
  },

  me: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new ApiError(error.message);
    return { id: data.user?.id || "", username: data.user?.user_metadata?.username || "", nickname: data.user?.user_metadata?.nickname || "", is_admin: false };
  },

  listShops: async (params: { category?: string; keyword?: string } = {}) => {
    let query = supabase.from('shops').select('*');
    if (params.category && params.category !== "all") {
      query = query.eq('category', params.category);
    }
    if (params.keyword) {
      query = query.ilike('name', `%${params.keyword}%`);
    }
    const { data, error } = await query;
    if (error) throw new ApiError(error.message);
    return data || [];
  },

  getShop: async (id: number) => {
    const { data, error } = await supabase
      .from('shops')
      .select('*, check_ins(*, users(username))')
      .eq('id', id)
      .single();
    if (error) throw new ApiError(error.message);
    return data as ShopDetail;
  },

  checkIn: async (payload: {
    shop_id: number;
    lat: number;
    lng: number;
    images?: string[];
    rating?: number;
    comment?: string;
  }) => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw new ApiError("未登录");
    const { data, error } = await supabase
      .from('check_ins')
      .insert({
        user_id: userData.user?.id,
        shop_id: payload.shop_id,
        images: payload.images || [],
        rating: payload.rating,
        comment: payload.comment,
        snapshot_lat: payload.lat,
        snapshot_lng: payload.lng,
      })
      .select()
      .single();
    if (error) throw new ApiError(error.message);
    return data;
  },

  myCheckIns: async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw new ApiError("未登录");
    const { data, error } = await supabase
      .from('check_ins')
      .select('*, shops(name)')
      .eq('user_id', userData.user?.id);
    if (error) throw new ApiError(error.message);
    return data || [];
  },

  deleteCheckIn: async (id: number) => {
    const { error } = await supabase
      .from('check_ins')
      .delete()
      .eq('id', id);
    if (error) throw new ApiError(error.message);
    return { success: true };
  },

  myStats: async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw new ApiError("未登录");
    const { data, error } = await supabase
      .from('check_ins')
      .select('*, shops(category)')
      .eq('user_id', userData.user?.id);
    if (error) throw new ApiError(error.message);
    const total = data?.length || 0;
    const category_breakdown: Record<string, number> = {};
    (data || []).forEach((item: any) => {
      const cat = item.shops?.category || '未知';
      category_breakdown[cat] = (category_breakdown[cat] || 0) + 1;
    });
    return {
      total_check_ins: total,
      city_count: 0,
      category_breakdown: category_breakdown,
    };
  },

  uploadImage: async (file: File) => {
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('checkin-images')
      .upload(fileName, file);
    if (error) throw new ApiError(error.message);
    const { data: urlData } = supabase.storage
      .from('checkin-images')
      .getPublicUrl(fileName);
    return { url: urlData?.publicUrl || '' };
  },
};

export { ApiError };
