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
      anamnesis: {
        Row: {
          answers: Json
          client_id: string
          client_notes: string | null
          created_at: string
          id: string
          professional_notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          client_id: string
          client_notes?: string | null
          created_at?: string
          id?: string
          professional_notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          client_id?: string
          client_notes?: string | null
          created_at?: string
          id?: string
          professional_notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          amount: number
          appointment_date: string
          appointment_time: string
          client_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_walk_in: boolean
          notes: string | null
          package_id: string | null
          payment_method: string | null
          professional: string | null
          service_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          appointment_date: string
          appointment_time: string
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_walk_in?: boolean
          notes?: string | null
          package_id?: string | null
          payment_method?: string | null
          professional?: string | null
          service_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          appointment_date?: string
          appointment_time?: string
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_walk_in?: boolean
          notes?: string | null
          package_id?: string | null
          payment_method?: string | null
          professional?: string | null
          service_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          custom_fields: Json | null
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_fields?: Json | null
          deleted_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_fields?: Json | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      debt_installments: {
        Row: {
          amount: number
          created_at: string
          debt_id: string
          due_date: string
          id: string
          number: number
          paid_at: string | null
          payment_method: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          debt_id: string
          due_date: string
          id?: string
          number: number
          paid_at?: string | null
          payment_method?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          debt_id?: string
          due_date?: string
          id?: string
          number?: number
          paid_at?: string | null
          payment_method?: string | null
          user_id?: string
        }
        Relationships: []
      }
      debts: {
        Row: {
          appointment_id: string | null
          client_id: string
          created_at: string
          id: string
          installments_count: number
          interest_amount: number
          notes: string | null
          origin: string
          original_amount: number
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          installments_count?: number
          interest_amount?: number
          notes?: string | null
          origin?: string
          original_amount?: number
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          installments_count?: number
          interest_amount?: number
          notes?: string | null
          origin?: string
          original_amount?: number
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          fee_amount: number | null
          fee_percent: number | null
          gross_amount: number
          id: string
          net_amount: number
          origin: string | null
          origin_id: string | null
          payment_method: string | null
          transaction_date: string
          type: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          fee_amount?: number | null
          fee_percent?: number | null
          gross_amount?: number
          id?: string
          net_amount?: number
          origin?: string | null
          origin_id?: string | null
          payment_method?: string | null
          transaction_date?: string
          type: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          fee_amount?: number | null
          fee_percent?: number | null
          gross_amount?: number
          id?: string
          net_amount?: number
          origin?: string | null
          origin_id?: string | null
          payment_method?: string | null
          transaction_date?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          config: Json
          created_at: string
          id: string
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          provider: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marketing_posts: {
        Row: {
          channel: string | null
          content: string | null
          created_at: string
          deleted_at: string | null
          id: string
          scheduled_for: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string | null
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          scheduled_for?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string | null
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          scheduled_for?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      package_sessions: {
        Row: {
          appointment_id: string | null
          created_at: string
          id: string
          package_id: string
          service_id: string | null
          session_number: number
          status: string
          treatment: string
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          package_id: string
          service_id?: string | null
          session_number: number
          status?: string
          treatment: string
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          package_id?: string
          service_id?: string | null
          session_number?: number
          status?: string
          treatment?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_sessions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_sessions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      package_templates: {
        Row: {
          created_at: string
          deleted_at: string | null
          finish_type: string
          id: string
          name: string
          price: number
          treatments: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          finish_type?: string
          id?: string
          name: string
          price?: number
          treatments?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          finish_type?: string
          id?: string
          name?: string
          price?: number
          treatments?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          client_id: string
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          payment_method: string | null
          start_date: string | null
          status: string
          template_id: string | null
          total_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          payment_method?: string | null
          start_date?: string | null
          status?: string
          template_id?: string | null
          total_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          payment_method?: string | null
          start_date?: string | null
          status?: string
          template_id?: string | null
          total_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "package_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_proofs: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          file_path: string
          id: string
          method: string | null
          notes: string | null
          paid_at: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by: string
          file_path: string
          id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          file_path?: string
          id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          limits: Json
          modules: Json
          name: string
          price: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          limits?: Json
          modules?: Json
          name: string
          price?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          limits?: Json
          modules?: Json
          name?: string
          price?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          category_id: string | null
          cost: number | null
          created_at: string
          deleted_at: string | null
          id: string
          is_ingredient_residue: boolean
          min_stock: number
          name: string
          sale_price: number
          stock: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          cost?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_ingredient_residue?: boolean
          min_stock?: number
          name: string
          sale_price?: number
          stock?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          category_id?: string | null
          cost?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_ingredient_residue?: boolean
          min_stock?: number
          name?: string
          sale_price?: number
          stock?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          border_style: string
          company_name: string | null
          created_at: string
          custom_properties: Json
          enabled_modules: Json
          estimated_volume: string | null
          full_name: string | null
          id: string
          instagram_discount: Json
          logo_url: string | null
          niche: string
          onboarding_completed: boolean
          payment_fees: Json
          phone_number: string | null
          plan: string
          primary_color: string
          remember_me: boolean | null
          terms: Json
          updated_at: string
        }
        Insert: {
          account_status?: string
          border_style?: string
          company_name?: string | null
          created_at?: string
          custom_properties?: Json
          enabled_modules?: Json
          estimated_volume?: string | null
          full_name?: string | null
          id: string
          instagram_discount?: Json
          logo_url?: string | null
          niche?: string
          onboarding_completed?: boolean
          payment_fees?: Json
          phone_number?: string | null
          plan?: string
          primary_color?: string
          remember_me?: boolean | null
          terms?: Json
          updated_at?: string
        }
        Update: {
          account_status?: string
          border_style?: string
          company_name?: string | null
          created_at?: string
          custom_properties?: Json
          enabled_modules?: Json
          estimated_volume?: string | null
          full_name?: string | null
          id?: string
          instagram_discount?: Json
          logo_url?: string | null
          niche?: string
          onboarding_completed?: boolean
          payment_fees?: Json
          phone_number?: string | null
          plan?: string
          primary_color?: string
          remember_me?: boolean | null
          terms?: Json
          updated_at?: string
        }
        Relationships: []
      }
      promo_commands: {
        Row: {
          affected_count: number
          command: string
          created_at: string
          id: string
          result: Json
          user_id: string
        }
        Insert: {
          affected_count?: number
          command: string
          created_at?: string
          id?: string
          result?: Json
          user_id: string
        }
        Update: {
          affected_count?: number
          command?: string
          created_at?: string
          id?: string
          result?: Json
          user_id?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          appointment_id: string | null
          created_at: string
          id: string
          package_id: string | null
          reason: string | null
          restocked: Json
          user_id: string
        }
        Insert: {
          amount?: number
          appointment_id?: string | null
          created_at?: string
          id?: string
          package_id?: string | null
          reason?: string | null
          restocked?: Json
          user_id: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          created_at?: string
          id?: string
          package_id?: string | null
          reason?: string | null
          restocked?: Json
          user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          category: string | null
          cost: number | null
          created_at: string
          deleted_at: string | null
          duration_minutes: number
          id: string
          name: string
          starting_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          cost?: number | null
          created_at?: string
          deleted_at?: string | null
          duration_minutes?: number
          id?: string
          name: string
          starting_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          cost?: number | null
          created_at?: string
          deleted_at?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          starting_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_orders: {
        Row: {
          amount: number
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          payload: Json
          site_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          payload?: Json
          site_id?: string | null
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          payload?: Json
          site_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      sites: {
        Row: {
          created_at: string
          id: string
          published: boolean
          sections: Json
          slug: string
          theme: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          published?: boolean
          sections?: Json
          slug: string
          theme?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          published?: boolean
          sections?: Json
          slug?: string
          theme?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string
          id: string
          last_paid_at: string | null
          plan_slug: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string
          id?: string
          last_paid_at?: string | null
          plan_slug: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string
          id?: string
          last_paid_at?: string | null
          plan_slug?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          ticket_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          status: string
          subject: string
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          linked_post_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          linked_post_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          linked_post_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
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
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
