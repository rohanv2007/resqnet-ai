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
      alert_deliveries: {
        Row: {
          alert_id: string
          channel: string
          created_at: string
          id: string
          provider_response: Json | null
          recipient: string | null
          status: string
        }
        Insert: {
          alert_id: string
          channel: string
          created_at?: string
          id?: string
          provider_response?: Json | null
          recipient?: string | null
          status?: string
        }
        Update: {
          alert_id?: string
          channel?: string
          created_at?: string
          id?: string
          provider_response?: Json | null
          recipient?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_deliveries_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          approved_by: string | null
          channels: string[]
          created_at: string
          created_by: string | null
          delivered_count: number | null
          disaster: Database["public"]["Enums"]["disaster_type"]
          expected_impact_at: string | null
          id: string
          language: Database["public"]["Enums"]["alert_language"]
          lat: number | null
          lng: number | null
          location_name: string | null
          message: string
          radius_km: number | null
          recipient_count: number | null
          sent_at: string | null
          severity: Database["public"]["Enums"]["risk_level"]
          shelter_id: string | null
          status: Database["public"]["Enums"]["alert_status"]
          title: string
        }
        Insert: {
          approved_by?: string | null
          channels?: string[]
          created_at?: string
          created_by?: string | null
          delivered_count?: number | null
          disaster?: Database["public"]["Enums"]["disaster_type"]
          expected_impact_at?: string | null
          id?: string
          language?: Database["public"]["Enums"]["alert_language"]
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          message: string
          radius_km?: number | null
          recipient_count?: number | null
          sent_at?: string | null
          severity?: Database["public"]["Enums"]["risk_level"]
          shelter_id?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          title: string
        }
        Update: {
          approved_by?: string | null
          channels?: string[]
          created_at?: string
          created_by?: string | null
          delivered_count?: number | null
          disaster?: Database["public"]["Enums"]["disaster_type"]
          expected_impact_at?: string | null
          id?: string
          language?: Database["public"]["Enums"]["alert_language"]
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          message?: string
          radius_km?: number | null
          recipient_count?: number | null
          sent_at?: string | null
          severity?: Database["public"]["Enums"]["risk_level"]
          shelter_id?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      citizen_reports: {
        Row: {
          created_at: string
          description: string
          id: string
          image_url: string | null
          lat: number
          lng: number
          location_name: string | null
          reported_by_name: string | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["risk_level"]
          status: Database["public"]["Enums"]["report_status"]
          title: string | null
          type: Database["public"]["Enums"]["report_type"]
          updated_at: string
          user_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          lat: number
          lng: number
          location_name?: string | null
          reported_by_name?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["risk_level"]
          status?: Database["public"]["Enums"]["report_status"]
          title?: string | null
          type: Database["public"]["Enums"]["report_type"]
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          lat?: number
          lng?: number
          location_name?: string | null
          reported_by_name?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["risk_level"]
          status?: Database["public"]["Enums"]["report_status"]
          title?: string | null
          type?: Database["public"]["Enums"]["report_type"]
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      evacuation_routes: {
        Row: {
          created_at: string
          distance_km: number | null
          duration_min: number | null
          geometry: Json | null
          id: string
          origin_lat: number
          origin_lng: number
          safety_score: number | null
          shelter_id: string | null
          warnings: string[] | null
        }
        Insert: {
          created_at?: string
          distance_km?: number | null
          duration_min?: number | null
          geometry?: Json | null
          id?: string
          origin_lat: number
          origin_lng: number
          safety_score?: number | null
          shelter_id?: string | null
          warnings?: string[] | null
        }
        Update: {
          created_at?: string
          distance_km?: number | null
          duration_min?: number | null
          geometry?: Json | null
          id?: string
          origin_lat?: number
          origin_lng?: number
          safety_score?: number | null
          shelter_id?: string | null
          warnings?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "evacuation_routes_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      fire_hotspots: {
        Row: {
          acq_datetime: string | null
          brightness: number | null
          confidence: number | null
          fetched_at: string
          frp: number | null
          id: string
          lat: number
          lng: number
          raw: Json | null
          satellite: string | null
        }
        Insert: {
          acq_datetime?: string | null
          brightness?: number | null
          confidence?: number | null
          fetched_at?: string
          frp?: number | null
          id?: string
          lat: number
          lng: number
          raw?: Json | null
          satellite?: string | null
        }
        Update: {
          acq_datetime?: string | null
          brightness?: number | null
          confidence?: number | null
          fetched_at?: string
          frp?: number | null
          id?: string
          lat?: number
          lng?: number
          raw?: Json | null
          satellite?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          created_at: string
          district: string | null
          id: string
          lat: number
          lng: number
          name: string
          population: number | null
          state: string | null
          type: string
        }
        Insert: {
          created_at?: string
          district?: string | null
          id?: string
          lat: number
          lng: number
          name: string
          population?: number | null
          state?: string | null
          type?: string
        }
        Update: {
          created_at?: string
          district?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          population?: number | null
          state?: string | null
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          district: string | null
          id: string
          language: Database["public"]["Enums"]["alert_language"]
          name: string
          organization: string | null
          phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          district?: string | null
          id: string
          language?: Database["public"]["Enums"]["alert_language"]
          name?: string
          organization?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          district?: string | null
          id?: string
          language?: Database["public"]["Enums"]["alert_language"]
          name?: string
          organization?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          assigned_alert_id: string | null
          capacity: number | null
          contact: string | null
          current_load: number | null
          id: string
          lat: number | null
          lng: number | null
          location: string | null
          name: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          assigned_alert_id?: string | null
          capacity?: number | null
          contact?: string | null
          current_load?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          location?: string | null
          name: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          assigned_alert_id?: string | null
          capacity?: number | null
          contact?: string | null
          current_load?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          location?: string | null
          name?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_assigned_alert_id_fkey"
            columns: ["assigned_alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_scores: {
        Row: {
          computed_at: string
          confidence: number
          disaster: Database["public"]["Enums"]["disaster_type"]
          id: string
          lat: number
          level: Database["public"]["Enums"]["risk_level"]
          lng: number
          location_name: string | null
          recommended_action: string | null
          score: number
          top_factors: Json | null
          trend: string | null
        }
        Insert: {
          computed_at?: string
          confidence?: number
          disaster: Database["public"]["Enums"]["disaster_type"]
          id?: string
          lat: number
          level: Database["public"]["Enums"]["risk_level"]
          lng: number
          location_name?: string | null
          recommended_action?: string | null
          score: number
          top_factors?: Json | null
          trend?: string | null
        }
        Update: {
          computed_at?: string
          confidence?: number
          disaster?: Database["public"]["Enums"]["disaster_type"]
          id?: string
          lat?: number
          level?: Database["public"]["Enums"]["risk_level"]
          lng?: number
          location_name?: string | null
          recommended_action?: string | null
          score?: number
          top_factors?: Json | null
          trend?: string | null
        }
        Relationships: []
      }
      road_status: {
        Row: {
          id: string
          lat: number
          lng: number
          name: string | null
          reported_at: string
          source: string | null
          status: string
        }
        Insert: {
          id?: string
          lat: number
          lng: number
          name?: string | null
          reported_at?: string
          source?: string | null
          status?: string
        }
        Update: {
          id?: string
          lat?: number
          lng?: number
          name?: string | null
          reported_at?: string
          source?: string | null
          status?: string
        }
        Relationships: []
      }
      shelters: {
        Row: {
          capacity: number
          contact: string | null
          district: string | null
          facilities: Json | null
          id: string
          lat: number
          lng: number
          name: string
          occupancy: number
          state: string | null
          status: string
          type: string | null
          updated_at: string
        }
        Insert: {
          capacity?: number
          contact?: string | null
          district?: string | null
          facilities?: Json | null
          id?: string
          lat: number
          lng: number
          name: string
          occupancy?: number
          state?: string | null
          status?: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number
          contact?: string | null
          district?: string | null
          facilities?: Json | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          occupancy?: number
          state?: string | null
          status?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      simulation_runs: {
        Row: {
          affected_population: number | null
          confidence: number | null
          created_at: string
          created_by: string | null
          disaster: Database["public"]["Enums"]["disaster_type"]
          id: string
          lat: number
          lng: number
          parameters: Json
          result: Json
          roads_blocked: number | null
          scenario_name: string | null
          shelters_at_risk: number | null
        }
        Insert: {
          affected_population?: number | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          disaster: Database["public"]["Enums"]["disaster_type"]
          id?: string
          lat: number
          lng: number
          parameters?: Json
          result?: Json
          roads_blocked?: number | null
          scenario_name?: string | null
          shelters_at_risk?: number | null
        }
        Update: {
          affected_population?: number | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          disaster?: Database["public"]["Enums"]["disaster_type"]
          id?: string
          lat?: number
          lng?: number
          parameters?: Json
          result?: Json
          roads_blocked?: number | null
          scenario_name?: string | null
          shelters_at_risk?: number | null
        }
        Relationships: []
      }
      telegram_subscribers: {
        Row: {
          active: boolean
          alert_radius_km: number
          chat_id: number
          created_at: string
          first_name: string | null
          language: string | null
          lat: number | null
          lng: number | null
          location_updated_at: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          active?: boolean
          alert_radius_km?: number
          chat_id: number
          created_at?: string
          first_name?: string | null
          language?: string | null
          lat?: number | null
          lng?: number | null
          location_updated_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          active?: boolean
          alert_radius_km?: number
          chat_id?: number
          created_at?: string
          first_name?: string | null
          language?: string | null
          lat?: number | null
          lng?: number | null
          location_updated_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weather_snapshots: {
        Row: {
          created_at: string
          forecast_time: string | null
          humidity: number | null
          id: string
          lat: number
          lng: number
          pressure: number | null
          rainfall_mm: number | null
          raw: Json | null
          source: string
          temperature: number | null
          wind_speed_kmh: number | null
        }
        Insert: {
          created_at?: string
          forecast_time?: string | null
          humidity?: number | null
          id?: string
          lat: number
          lng: number
          pressure?: number | null
          rainfall_mm?: number | null
          raw?: Json | null
          source?: string
          temperature?: number | null
          wind_speed_kmh?: number | null
        }
        Update: {
          created_at?: string
          forecast_time?: string | null
          humidity?: number | null
          id?: string
          lat?: number
          lng?: number
          pressure?: number | null
          rainfall_mm?: number | null
          raw?: Json | null
          source?: string
          temperature?: number | null
          wind_speed_kmh?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alert_language:
        | "english"
        | "hindi"
        | "malayalam"
        | "tamil"
        | "telugu"
        | "kannada"
        | "bengali"
        | "marathi"
        | "gujarati"
        | "odia"
        | "punjabi"
      alert_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "sent"
        | "cancelled"
        | "failed"
      app_role: "citizen" | "authority" | "ngo" | "admin"
      disaster_type:
        | "flood"
        | "cyclone"
        | "wildfire"
        | "urban_fire"
        | "earthquake"
        | "rainfall"
        | "landslide"
      report_status: "new" | "verified" | "duplicate" | "rejected" | "resolved"
      report_type:
        | "rising_water"
        | "blocked_road"
        | "fire"
        | "damaged_bridge"
        | "shelter_overcrowding"
        | "power_failure"
        | "medical_help"
        | "trapped_people"
        | "other"
      risk_level: "low" | "watch" | "warning" | "danger"
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
      alert_language: [
        "english",
        "hindi",
        "malayalam",
        "tamil",
        "telugu",
        "kannada",
        "bengali",
        "marathi",
        "gujarati",
        "odia",
        "punjabi",
      ],
      alert_status: [
        "draft",
        "pending_approval",
        "approved",
        "sent",
        "cancelled",
        "failed",
      ],
      app_role: ["citizen", "authority", "ngo", "admin"],
      disaster_type: [
        "flood",
        "cyclone",
        "wildfire",
        "urban_fire",
        "earthquake",
        "rainfall",
        "landslide",
      ],
      report_status: ["new", "verified", "duplicate", "rejected", "resolved"],
      report_type: [
        "rising_water",
        "blocked_road",
        "fire",
        "damaged_bridge",
        "shelter_overcrowding",
        "power_failure",
        "medical_help",
        "trapped_people",
        "other",
      ],
      risk_level: ["low", "watch", "warning", "danger"],
    },
  },
} as const
