export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chains: {
        Row: { color: string; created_at: string | null; id: string; name: Database["public"]["Enums"]["chain_type"]; tenant_id: string }
        Insert: { color?: string; created_at?: string | null; id?: string; name: Database["public"]["Enums"]["chain_type"]; tenant_id: string }
        Update: { color?: string; created_at?: string | null; id?: string; name?: Database["public"]["Enums"]["chain_type"]; tenant_id?: string }
        Relationships: [{ foreignKeyName: "chains_tenant_id_fkey"; columns: ["tenant_id"]; isOneToOne: false; referencedRelation: "tenants"; referencedColumns: ["id"] }]
      }
      content_items: {
        Row: { approved_by: string | null; body: Json; created_at: string | null; created_by: string; id: string; status: Database["public"]["Enums"]["content_status"] | null; tenant_id: string; title: string; type: Database["public"]["Enums"]["content_type"]; updated_at: string | null; valid_from: string | null; valid_to: string | null }
        Insert: { approved_by?: string | null; body?: Json; created_at?: string | null; created_by: string; id?: string; status?: Database["public"]["Enums"]["content_status"] | null; tenant_id: string; title: string; type: Database["public"]["Enums"]["content_type"]; updated_at?: string | null; valid_from?: string | null; valid_to?: string | null }
        Update: { approved_by?: string | null; body?: Json; created_at?: string | null; created_by?: string; id?: string; status?: Database["public"]["Enums"]["content_status"] | null; tenant_id?: string; title?: string; type?: Database["public"]["Enums"]["content_type"]; updated_at?: string | null; valid_from?: string | null; valid_to?: string | null }
        Relationships: []
      }
      content_targets: {
        Row: { chain_id: string | null; content_item_id: string; id: string; store_id: string | null; tag_id: string | null; target_all: boolean | null }
        Insert: { chain_id?: string | null; content_item_id: string; id?: string; store_id?: string | null; tag_id?: string | null; target_all?: boolean | null }
        Update: { chain_id?: string | null; content_item_id?: string; id?: string; store_id?: string | null; tag_id?: string | null; target_all?: boolean | null }
        Relationships: []
      }
      media_uploads: {
        Row: { created_at: string | null; file_name: string; id: string; mime_type: string; size_bytes: number; storage_path: string; tenant_id: string; uploaded_by: string }
        Insert: { created_at?: string | null; file_name: string; id?: string; mime_type: string; size_bytes: number; storage_path: string; tenant_id: string; uploaded_by: string }
        Update: { created_at?: string | null; file_name?: string; id?: string; mime_type?: string; size_bytes?: number; storage_path?: string; tenant_id?: string; uploaded_by?: string }
        Relationships: []
      }
      playlist_items: {
        Row: { content_item_id: string; duration_seconds: number; id: string; playlist_id: string; position: number }
        Insert: { content_item_id: string; duration_seconds?: number; id?: string; playlist_id: string; position?: number }
        Update: { content_item_id?: string; duration_seconds?: number; id?: string; playlist_id?: string; position?: number }
        Relationships: []
      }
      playlists: {
        Row: { created_at: string | null; id: string; name: string; tenant_id: string }
        Insert: { created_at?: string | null; id?: string; name: string; tenant_id: string }
        Update: { created_at?: string | null; id?: string; name?: string; tenant_id?: string }
        Relationships: []
      }
      screen_playlists: {
        Row: { playlist_id: string; priority: number | null; screen_id: string }
        Insert: { playlist_id: string; priority?: number | null; screen_id: string }
        Update: { playlist_id?: string; priority?: number | null; screen_id?: string }
        Relationships: []
      }
      screens: {
        Row: { created_at: string | null; id: string; last_seen_at: string | null; name: string; status: Database["public"]["Enums"]["screen_status"] | null; store_id: string; tenant_id: string; token: string }
        Insert: { created_at?: string | null; id?: string; last_seen_at?: string | null; name: string; status?: Database["public"]["Enums"]["screen_status"] | null; store_id: string; tenant_id: string; token: string }
        Update: { created_at?: string | null; id?: string; last_seen_at?: string | null; name?: string; status?: Database["public"]["Enums"]["screen_status"] | null; store_id?: string; tenant_id?: string; token?: string }
        Relationships: []
      }
      store_tags: {
        Row: { store_id: string; tag_id: string }
        Insert: { store_id: string; tag_id: string }
        Update: { store_id?: string; tag_id?: string }
        Relationships: []
      }
      stores: {
        Row: { chain_id: string; city: string; company_name: string; created_at: string | null; email: string; gln: string; id: string; latitude: number | null; longitude: number | null; name: string; org_number: string; tenant_id: string }
        Insert: { chain_id: string; city: string; company_name: string; created_at?: string | null; email: string; gln: string; id?: string; latitude?: number | null; longitude?: number | null; name: string; org_number: string; tenant_id: string }
        Update: { chain_id?: string; city?: string; company_name?: string; created_at?: string | null; email?: string; gln?: string; id?: string; latitude?: number | null; longitude?: number | null; name?: string; org_number?: string; tenant_id?: string }
        Relationships: []
      }
      tags: {
        Row: { color: string; created_at: string | null; id: string; name: string; tenant_id: string }
        Insert: { color?: string; created_at?: string | null; id?: string; name: string; tenant_id: string }
        Update: { color?: string; created_at?: string | null; id?: string; name?: string; tenant_id?: string }
        Relationships: []
      }
      tenants: {
        Row: { created_at: string | null; id: string; name: string; slug: string }
        Insert: { created_at?: string | null; id?: string; name: string; slug: string }
        Update: { created_at?: string | null; id?: string; name?: string; slug?: string }
        Relationships: []
      }
      user_stores: {
        Row: { store_id: string; user_id: string }
        Insert: { store_id: string; user_id: string }
        Update: { store_id?: string; user_id?: string }
        Relationships: []
      }
      users: {
        Row: { chain_id: string | null; created_at: string | null; email: string; full_name: string; id: string; role: Database["public"]["Enums"]["user_role"]; tenant_id: string }
        Insert: { chain_id?: string | null; created_at?: string | null; email: string; full_name: string; id: string; role?: Database["public"]["Enums"]["user_role"]; tenant_id: string }
        Update: { chain_id?: string | null; created_at?: string | null; email?: string; full_name?: string; id?: string; role?: Database["public"]["Enums"]["user_role"]; tenant_id?: string }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      get_my_role: { Args: never; Returns: Database["public"]["Enums"]["user_role"] }
      get_my_tenant_id: { Args: never; Returns: string }
    }
    Enums: {
      chain_type: "EUROSPAR" | "JOKER" | "SPAR"
      content_status: "draft" | "pending_approval" | "approved" | "rejected" | "archived"
      content_type: "news" | "competition" | "stats" | "weather" | "slide"
      screen_status: "active" | "inactive" | "maintenance"
      user_role: "super_admin" | "chain_manager" | "store_manager" | "store_employee"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Update"]
export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T]
