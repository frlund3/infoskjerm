export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type ChainType = "EUROSPAR" | "JOKER" | "SPAR"
export type UserRole = "super_admin" | "chain_manager" | "store_manager" | "store_employee"
export type ContentType = "news" | "competition" | "stats" | "weather" | "slide"
export type ContentStatus = "draft" | "pending_approval" | "approved" | "rejected" | "archived"
export type ScreenStatus = "active" | "inactive" | "maintenance"

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: { id: string; name: string; slug: string; created_at: string }
        Insert: { id?: string; name: string; slug: string; created_at?: string }
        Update: { id?: string; name?: string; slug?: string }
      }
      chains: {
        Row: { id: string; tenant_id: string; name: ChainType; color: string; created_at: string }
        Insert: { id?: string; tenant_id: string; name: ChainType; color: string; created_at?: string }
        Update: { id?: string; name?: ChainType; color?: string }
      }
      stores: {
        Row: {
          id: string
          tenant_id: string
          chain_id: string
          name: string
          company_name: string
          org_number: string
          gln: string
          email: string
          city: string
          latitude: number | null
          longitude: number | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          chain_id: string
          name: string
          company_name: string
          org_number: string
          gln: string
          email: string
          city: string
          latitude?: number | null
          longitude?: number | null
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["stores"]["Insert"]>
      }
      tags: {
        Row: { id: string; tenant_id: string; name: string; color: string; created_at: string }
        Insert: { id?: string; tenant_id: string; name: string; color: string; created_at?: string }
        Update: { id?: string; name?: string; color?: string }
      }
      store_tags: {
        Row: { store_id: string; tag_id: string }
        Insert: { store_id: string; tag_id: string }
        Update: never
      }
      screens: {
        Row: {
          id: string
          store_id: string
          tenant_id: string
          name: string
          token: string
          status: ScreenStatus
          last_seen_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          tenant_id: string
          name: string
          token: string
          status?: ScreenStatus
          last_seen_at?: string | null
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["screens"]["Insert"]>
      }
      users: {
        Row: {
          id: string
          tenant_id: string
          email: string
          full_name: string
          role: UserRole
          chain_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          email: string
          full_name: string
          role: UserRole
          chain_id?: string | null
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>
      }
      user_stores: {
        Row: { user_id: string; store_id: string }
        Insert: { user_id: string; store_id: string }
        Update: never
      }
      content_items: {
        Row: {
          id: string
          tenant_id: string
          type: ContentType
          title: string
          body: Json
          status: ContentStatus
          created_by: string
          approved_by: string | null
          valid_from: string | null
          valid_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          type: ContentType
          title: string
          body: Json
          status?: ContentStatus
          created_by: string
          approved_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["content_items"]["Insert"]>
      }
      playlists: {
        Row: {
          id: string
          tenant_id: string
          name: string
          created_at: string
        }
        Insert: { id?: string; tenant_id: string; name: string; created_at?: string }
        Update: { id?: string; name?: string }
      }
      playlist_items: {
        Row: {
          id: string
          playlist_id: string
          content_item_id: string
          position: number
          duration_seconds: number
        }
        Insert: {
          id?: string
          playlist_id: string
          content_item_id: string
          position: number
          duration_seconds?: number
        }
        Update: Partial<Database["public"]["Tables"]["playlist_items"]["Insert"]>
      }
      screen_playlists: {
        Row: { screen_id: string; playlist_id: string; priority: number }
        Insert: { screen_id: string; playlist_id: string; priority?: number }
        Update: { priority?: number }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
