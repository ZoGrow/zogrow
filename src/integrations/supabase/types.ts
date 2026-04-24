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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          id: number
          new_data: Json | null
          occurred_at: string
          old_data: Json | null
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          id?: number
          new_data?: Json | null
          occurred_at?: string
          old_data?: Json | null
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          id?: number
          new_data?: Json | null
          occurred_at?: string
          old_data?: Json | null
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      b2b_ads_metrics: {
        Row: {
          ad_spend: number | null
          appointments_booked: number | null
          appointments_showed: number | null
          cash_collected: number | null
          clicks: number | null
          client_id: string | null
          contracts_signed: number | null
          created_at: string
          date: string
          deals_closed: number | null
          demo_booked: number | null
          demo_showed: number | null
          dials_made: number | null
          id: string
          impressions: number | null
          intro_call_booked: number | null
          intro_call_showed: number | null
          leads: number | null
          notes: string | null
          pickups: number | null
          qualified_intro_showed: number | null
          qualified_leads: number | null
          qualified_showed: number | null
          revenue: number | null
          updated_at: string
        }
        Insert: {
          ad_spend?: number | null
          appointments_booked?: number | null
          appointments_showed?: number | null
          cash_collected?: number | null
          clicks?: number | null
          client_id?: string | null
          contracts_signed?: number | null
          created_at?: string
          date: string
          deals_closed?: number | null
          demo_booked?: number | null
          demo_showed?: number | null
          dials_made?: number | null
          id?: string
          impressions?: number | null
          intro_call_booked?: number | null
          intro_call_showed?: number | null
          leads?: number | null
          notes?: string | null
          pickups?: number | null
          qualified_intro_showed?: number | null
          qualified_leads?: number | null
          qualified_showed?: number | null
          revenue?: number | null
          updated_at?: string
        }
        Update: {
          ad_spend?: number | null
          appointments_booked?: number | null
          appointments_showed?: number | null
          cash_collected?: number | null
          clicks?: number | null
          client_id?: string | null
          contracts_signed?: number | null
          created_at?: string
          date?: string
          deals_closed?: number | null
          demo_booked?: number | null
          demo_showed?: number | null
          dials_made?: number | null
          id?: string
          impressions?: number | null
          intro_call_booked?: number | null
          intro_call_showed?: number | null
          leads?: number | null
          notes?: string | null
          pickups?: number | null
          qualified_intro_showed?: number | null
          qualified_leads?: number | null
          qualified_showed?: number | null
          revenue?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_ads_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_lead_bookings: {
        Row: {
          booking_count: number
          booking_type: string
          client_id: string | null
          contact_id: string
          first_booked_at: string
          id: string
          latest_booked_at: string
        }
        Insert: {
          booking_count?: number
          booking_type: string
          client_id?: string | null
          contact_id: string
          first_booked_at?: string
          id?: string
          latest_booked_at?: string
        }
        Update: {
          booking_count?: number
          booking_type?: string
          client_id?: string | null
          contact_id?: string
          first_booked_at?: string
          id?: string
          latest_booked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_lead_bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          campaign_name: string
          client_id: string
          created_at: string
          id: string
          meta_campaign_id: string | null
          platform: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          campaign_name: string
          client_id: string
          created_at?: string
          id?: string
          meta_campaign_id?: string | null
          platform?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          campaign_name?: string
          client_id?: string
          created_at?: string
          id?: string
          meta_campaign_id?: string | null
          platform?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          client_name: string
          created_at: string
          id: string
          market: string
          meta_ad_account_id: string | null
          niche: string
          state: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_name: string
          created_at?: string
          id?: string
          market: string
          meta_ad_account_id?: string | null
          niche: string
          state: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_name?: string
          created_at?: string
          id?: string
          market?: string
          meta_ad_account_id?: string | null
          niche?: string
          state?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      dial_logs: {
        Row: {
          call_direction: string | null
          call_status: string | null
          caller_name: string | null
          caller_phone: string | null
          client_id: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          dialed_at: string
          external_event_id: string | null
          id: string
          raw_payload: Json | null
        }
        Insert: {
          call_direction?: string | null
          call_status?: string | null
          caller_name?: string | null
          caller_phone?: string | null
          client_id: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          dialed_at?: string
          external_event_id?: string | null
          id?: string
          raw_payload?: Json | null
        }
        Update: {
          call_direction?: string | null
          call_status?: string | null
          caller_name?: string | null
          caller_phone?: string | null
          client_id?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          dialed_at?: string
          external_event_id?: string | null
          id?: string
          raw_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dial_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_logs: {
        Row: {
          client_id: string
          contact_email: string | null
          contact_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          external_event_id: string | null
          id: string
          raw_payload: Json | null
          received_at: string
          source: string | null
        }
        Insert: {
          client_id: string
          contact_email?: string | null
          contact_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          external_event_id?: string | null
          id?: string
          raw_payload?: Json | null
          received_at?: string
          source?: string | null
        }
        Update: {
          client_id?: string
          contact_email?: string | null
          contact_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          external_event_id?: string | null
          id?: string
          raw_payload?: Json | null
          received_at?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          ad_spend: number | null
          appointments_booked: number | null
          appointments_showed: number | null
          campaign_id: string | null
          clicks: number | null
          client_id: string
          contracts_signed: number | null
          created_at: string
          date: string
          deals_closed: number | null
          dials_made: number | null
          id: string
          impressions: number | null
          leads: number | null
          live_transfers: number | null
          notes: string | null
          pickups: number | null
          revenue: number | null
          sales_team_booked: number | null
          self_booked: number | null
          setter: string | null
          updated_at: string
        }
        Insert: {
          ad_spend?: number | null
          appointments_booked?: number | null
          appointments_showed?: number | null
          campaign_id?: string | null
          clicks?: number | null
          client_id: string
          contracts_signed?: number | null
          created_at?: string
          date: string
          deals_closed?: number | null
          dials_made?: number | null
          id?: string
          impressions?: number | null
          leads?: number | null
          live_transfers?: number | null
          notes?: string | null
          pickups?: number | null
          revenue?: number | null
          sales_team_booked?: number | null
          self_booked?: number | null
          setter?: string | null
          updated_at?: string
        }
        Update: {
          ad_spend?: number | null
          appointments_booked?: number | null
          appointments_showed?: number | null
          campaign_id?: string | null
          clicks?: number | null
          client_id?: string
          contracts_signed?: number | null
          created_at?: string
          date?: string
          deals_closed?: number | null
          dials_made?: number | null
          id?: string
          impressions?: number | null
          leads?: number | null
          live_transfers?: number | null
          notes?: string | null
          pickups?: number | null
          revenue?: number | null
          sales_team_booked?: number | null
          self_booked?: number | null
          setter?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agency_name: string | null
          agency_website: string | null
          created_at: string
          email_alerts: boolean | null
          full_name: string | null
          high_cpl_alert: boolean | null
          id: string
          low_roas_alert: boolean | null
          updated_at: string
          user_id: string
          weekly_reports: boolean | null
        }
        Insert: {
          agency_name?: string | null
          agency_website?: string | null
          created_at?: string
          email_alerts?: boolean | null
          full_name?: string | null
          high_cpl_alert?: boolean | null
          id?: string
          low_roas_alert?: boolean | null
          updated_at?: string
          user_id: string
          weekly_reports?: boolean | null
        }
        Update: {
          agency_name?: string | null
          agency_website?: string | null
          created_at?: string
          email_alerts?: boolean | null
          full_name?: string | null
          high_cpl_alert?: boolean | null
          id?: string
          low_roas_alert?: boolean | null
          updated_at?: string
          user_id?: string
          weekly_reports?: boolean | null
        }
        Relationships: []
      }
      sales_metrics: {
        Row: {
          base_clients: number | null
          base_starting_mrr: number | null
          cancelled: number | null
          cash_committed: number | null
          client_id: string | null
          created_at: string
          date: string
          followup_calls_scheduled: number | null
          followup_calls_taken: number | null
          id: string
          lost_clients: number | null
          lost_mrr: number | null
          new_calls_scheduled: number | null
          new_calls_taken: number | null
          new_closes: number | null
          new_mrr: number | null
          no_shows: number | null
          notes: string | null
          otp: number | null
          period_type: string
          qualified_calls_taken: number | null
          rescheduled: number | null
          total_cash_collected: number | null
          updated_at: string
          upsell_mrr: number | null
        }
        Insert: {
          base_clients?: number | null
          base_starting_mrr?: number | null
          cancelled?: number | null
          cash_committed?: number | null
          client_id?: string | null
          created_at?: string
          date: string
          followup_calls_scheduled?: number | null
          followup_calls_taken?: number | null
          id?: string
          lost_clients?: number | null
          lost_mrr?: number | null
          new_calls_scheduled?: number | null
          new_calls_taken?: number | null
          new_closes?: number | null
          new_mrr?: number | null
          no_shows?: number | null
          notes?: string | null
          otp?: number | null
          period_type?: string
          qualified_calls_taken?: number | null
          rescheduled?: number | null
          total_cash_collected?: number | null
          updated_at?: string
          upsell_mrr?: number | null
        }
        Update: {
          base_clients?: number | null
          base_starting_mrr?: number | null
          cancelled?: number | null
          cash_committed?: number | null
          client_id?: string | null
          created_at?: string
          date?: string
          followup_calls_scheduled?: number | null
          followup_calls_taken?: number | null
          id?: string
          lost_clients?: number | null
          lost_mrr?: number | null
          new_calls_scheduled?: number | null
          new_calls_taken?: number | null
          new_closes?: number | null
          new_mrr?: number | null
          no_shows?: number | null
          notes?: string | null
          otp?: number | null
          period_type?: string
          qualified_calls_taken?: number | null
          rescheduled?: number | null
          total_cash_collected?: number | null
          updated_at?: string
          upsell_mrr?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_clients: { Args: { _user_id: string }; Returns: boolean }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_full_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "ceo" | "isa"
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
      app_role: ["admin", "moderator", "user", "ceo", "isa"],
    },
  },
} as const
