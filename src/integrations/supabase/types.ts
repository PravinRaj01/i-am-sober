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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      check_ins: {
        Row: {
          created_at: string
          id: string
          mood: string
          notes: string | null
          urge_intensity: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mood: string
          notes?: string | null
          urge_intensity?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mood?: string
          notes?: string | null
          urge_intensity?: number | null
          user_id?: string
        }
        Relationships: []
      }
      coping_activities: {
        Row: {
          activity_name: string
          category: string
          created_at: string
          helpful: boolean | null
          id: string
          times_used: number | null
          user_id: string
        }
        Insert: {
          activity_name: string
          category: string
          created_at?: string
          helpful?: boolean | null
          id?: string
          times_used?: number | null
          user_id: string
        }
        Update: {
          activity_name?: string
          category?: string
          created_at?: string
          helpful?: boolean | null
          id?: string
          times_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          completed: boolean | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          progress: number | null
          start_date: string | null
          target_days: number | null
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          progress?: number | null
          start_date?: string | null
          target_days?: number | null
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          progress?: number | null
          start_date?: string | null
          target_days?: number | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      motivations: {
        Row: {
          created_at: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          addiction_type: string | null
          background_image_url: string | null
          created_at: string
          huggingface_token: string | null
          id: string
          onboarding_completed: boolean | null
          privacy_settings: Json | null
          pseudonym: string | null
          sobriety_start_date: string
          updated_at: string
        }
        Insert: {
          addiction_type?: string | null
          background_image_url?: string | null
          created_at?: string
          huggingface_token?: string | null
          id: string
          onboarding_completed?: boolean | null
          privacy_settings?: Json | null
          pseudonym?: string | null
          sobriety_start_date?: string
          updated_at?: string
        }
        Update: {
          addiction_type?: string | null
          background_image_url?: string | null
          created_at?: string
          huggingface_token?: string | null
          id?: string
          onboarding_completed?: boolean | null
          privacy_settings?: Json | null
          pseudonym?: string | null
          sobriety_start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      reflections: {
        Row: {
          created_at: string
          id: string
          prompt: string
          response: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt: string
          response: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt?: string
          response?: string
          user_id?: string
        }
        Relationships: []
      }
      relapses: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          relapse_date: string
          triggers: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          relapse_date?: string
          triggers?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          relapse_date?: string
          triggers?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      supporters: {
        Row: {
          access_level: string | null
          created_at: string
          id: string
          status: string | null
          supporter_email: string
          supporter_name: string | null
          user_id: string
        }
        Insert: {
          access_level?: string | null
          created_at?: string
          id?: string
          status?: string | null
          supporter_email: string
          supporter_name?: string | null
          user_id: string
        }
        Update: {
          access_level?: string | null
          created_at?: string
          id?: string
          status?: string | null
          supporter_email?: string
          supporter_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      triggers: {
        Row: {
          created_at: string
          id: string
          intensity: number | null
          location: string | null
          situation: string | null
          trigger_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          intensity?: number | null
          location?: string | null
          situation?: string | null
          trigger_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          intensity?: number | null
          location?: string | null
          situation?: string | null
          trigger_type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
