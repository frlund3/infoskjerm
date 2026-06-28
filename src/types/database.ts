export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chains: {
        Row: {
          brand_fg: string | null
          brand_light: string | null
          color: string
          created_at: string | null
          id: string
          name: Database["public"]["Enums"]["chain_type"]
          tenant_id: string
        }
        Insert: {
          brand_fg?: string | null
          brand_light?: string | null
          color?: string
          created_at?: string | null
          id?: string
          name: Database["public"]["Enums"]["chain_type"]
          tenant_id: string
        }
        Update: {
          brand_fg?: string | null
          brand_light?: string | null
          color?: string
          created_at?: string | null
          id?: string
          name?: Database["public"]["Enums"]["chain_type"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          approved_by: string | null
          body: Json
          created_at: string | null
          created_by: string
          id: string
          module_key: string | null
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["content_status"] | null
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string | null
          valid_from: string | null
          valid_to: string | null
          version: number | null
          zone_id: string | null
        }
        Insert: {
          approved_by?: string | null
          body?: Json
          created_at?: string | null
          created_by: string
          id?: string
          module_key?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
          version?: number | null
          zone_id?: string | null
        }
        Update: {
          approved_by?: string | null
          body?: Json
          created_at?: string | null
          created_by?: string
          id?: string
          module_key?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          tenant_id?: string
          title?: string
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
          version?: number | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "module_registry"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "content_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      content_targets: {
        Row: {
          chain_id: string | null
          content_item_id: string
          id: string
          store_id: string | null
          tag_id: string | null
          target_all: boolean | null
        }
        Insert: {
          chain_id?: string | null
          content_item_id: string
          id?: string
          store_id?: string | null
          tag_id?: string | null
          target_all?: boolean | null
        }
        Update: {
          chain_id?: string | null
          content_item_id?: string
          id?: string
          store_id?: string | null
          tag_id?: string | null
          target_all?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "content_targets_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_targets_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_targets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_targets_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      media_uploads: {
        Row: {
          created_at: string | null
          file_name: string
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          tenant_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          id?: string
          mime_type: string
          size_bytes: number
          storage_path: string
          tenant_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          tenant_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_uploads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      module_registry: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          schema: Json
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          schema?: Json
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          schema?: Json
        }
        Relationships: []
      }
      playlist_items: {
        Row: {
          content_item_id: string
          duration_seconds: number
          id: string
          playlist_id: string
          position: number
        }
        Insert: {
          content_item_id: string
          duration_seconds?: number
          id?: string
          playlist_id: string
          position?: number
        }
        Update: {
          content_item_id?: string
          duration_seconds?: number
          id?: string
          playlist_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      publish_log: {
        Row: {
          action: string
          content_item_id: string | null
          created_at: string | null
          id: string
          performed_by: string | null
          snapshot: Json
        }
        Insert: {
          action: string
          content_item_id?: string | null
          created_at?: string | null
          id?: string
          performed_by?: string | null
          snapshot?: Json
        }
        Update: {
          action?: string
          content_item_id?: string | null
          created_at?: string | null
          id?: string
          performed_by?: string | null
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "publish_log_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_playlists: {
        Row: {
          playlist_id: string
          priority: number | null
          screen_id: string
        }
        Insert: {
          playlist_id: string
          priority?: number | null
          screen_id: string
        }
        Update: {
          playlist_id?: string
          priority?: number | null
          screen_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screen_playlists_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_playlists_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
        ]
      }
      screens: {
        Row: {
          app_info: string | null
          created_at: string | null
          id: string
          last_heartbeat: string | null
          last_seen_at: string | null
          name: string
          pending_command: string | null
          power_state: string
          status: Database["public"]["Enums"]["screen_status"] | null
          store_id: string
          tenant_id: string
          token: string
        }
        Insert: {
          app_info?: string | null
          created_at?: string | null
          id?: string
          last_heartbeat?: string | null
          last_seen_at?: string | null
          name: string
          pending_command?: string | null
          power_state?: string
          status?: Database["public"]["Enums"]["screen_status"] | null
          store_id: string
          tenant_id: string
          token: string
        }
        Update: {
          app_info?: string | null
          created_at?: string | null
          id?: string
          last_heartbeat?: string | null
          last_seen_at?: string | null
          name?: string
          pending_command?: string | null
          power_state?: string
          status?: Database["public"]["Enums"]["screen_status"] | null
          store_id?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "screens_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_tags: {
        Row: {
          store_id: string
          tag_id: string
        }
        Insert: {
          store_id: string
          tag_id: string
        }
        Update: {
          store_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_tags_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          chain_id: string
          city: string
          company_name: string
          created_at: string | null
          email: string
          gln: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          org_number: string
          tenant_id: string
        }
        Insert: {
          chain_id: string
          city: string
          company_name: string
          created_at?: string | null
          email: string
          gln: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          org_number: string
          tenant_id: string
        }
        Update: {
          chain_id?: string
          city?: string
          company_name?: string
          created_at?: string | null
          email?: string
          gln?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          org_number?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_modules: {
        Row: {
          enabled_at: string | null
          enabled_by: string | null
          module_key: string
          tenant_id: string
        }
        Insert: {
          enabled_at?: string | null
          enabled_by?: string | null
          module_key: string
          tenant_id: string
        }
        Update: {
          enabled_at?: string | null
          enabled_by?: string | null
          module_key?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_modules_enabled_by_fkey"
            columns: ["enabled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_modules_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "module_registry"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "tenant_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      user_stores: {
        Row: {
          store_id: string
          user_id: string
        }
        Insert: {
          store_id: string
          user_id: string
        }
        Update: {
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          chain_id: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
        }
        Insert: {
          chain_id?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id: string
        }
        Update: {
          chain_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_layouts: {
        Row: {
          chain_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          layout: Json
          name: string
          tenant_id: string
        }
        Insert: {
          chain_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          layout?: Json
          name: string
          tenant_id: string
        }
        Update: {
          chain_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          layout?: Json
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_layouts_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_layouts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_my_tenant_id: { Args: never; Returns: string }
      screen_ack: {
        Args: { p_command: string; p_token: string }
        Returns: undefined
      }
      screen_poll: {
        Args: { p_info?: string; p_token: string }
        Returns: {
          pending_command: string
          power_state: string
          screen_name: string
        }[]
      }
    }
    Enums: {
      chain_type: "EUROSPAR" | "JOKER" | "SPAR"
      content_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "archived"
        | "live"
        | "scheduled"
      content_type: "news" | "competition" | "stats" | "weather" | "slide"
      screen_status: "active" | "inactive" | "maintenance"
      user_role:
        | "super_admin"
        | "chain_manager"
        | "store_manager"
        | "store_employee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      chain_type: ["EUROSPAR", "JOKER", "SPAR"],
      content_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "archived",
        "live",
        "scheduled",
      ],
      content_type: ["news", "competition", "stats", "weather", "slide"],
      screen_status: ["active", "inactive", "maintenance"],
      user_role: [
        "super_admin",
        "chain_manager",
        "store_manager",
        "store_employee",
      ],
    },
  },
} as const
