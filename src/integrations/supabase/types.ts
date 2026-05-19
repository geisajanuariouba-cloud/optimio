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
          next_due_date: string | null
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
          next_due_date?: string | null
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
          next_due_date?: string | null
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
      anamnesis_templates: {
        Row: {
          id: string
          questions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          questions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          questions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: number
          support_email: string | null
          updated_at: string
          whatsapp_link: string | null
        }
        Insert: {
          id?: number
          support_email?: string | null
          updated_at?: string
          whatsapp_link?: string | null
        }
        Update: {
          id?: number
          support_email?: string | null
          updated_at?: string
          whatsapp_link?: string | null
        }
        Relationships: []
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
          payment_method_id: string | null
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
          payment_method_id?: string | null
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
          payment_method_id?: string | null
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
      assembler_commissions: {
        Row: {
          amount: number
          assembler_id: string
          cost_base: number
          created_at: string
          delivery_id: string | null
          financial_id: string | null
          id: string
          notes: string | null
          paid_at: string | null
          percent: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          assembler_id: string
          cost_base?: number
          created_at?: string
          delivery_id?: string | null
          financial_id?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          percent?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          assembler_id?: string
          cost_base?: number
          created_at?: string
          delivery_id?: string | null
          financial_id?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          percent?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assemblers: {
        Row: {
          created_at: string
          default_commission_percent: number
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_commission_percent?: number
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_commission_percent?: number
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_table: string
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_table: string
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_table?: string
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      cash_drawer_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          financial_id: string | null
          id: string
          reason: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          financial_id?: string | null
          id?: string
          reason: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          financial_id?: string | null
          id?: string
          reason?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          kind: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          kind: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          kind?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          birth_date: string | null
          cpf_cnpj: string | null
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
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          birth_date?: string | null
          cpf_cnpj?: string | null
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
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          birth_date?: string | null
          cpf_cnpj?: string | null
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
      combo_items: {
        Row: {
          combo_id: string
          created_at: string
          id: string
          item_type: string
          product_id: string | null
          quantity: number
          service_id: string | null
          unit_price: number
          user_id: string
        }
        Insert: {
          combo_id: string
          created_at?: string
          id?: string
          item_type: string
          product_id?: string | null
          quantity?: number
          service_id?: string | null
          unit_price?: number
          user_id: string
        }
        Update: {
          combo_id?: string
          created_at?: string
          id?: string
          item_type?: string
          product_id?: string | null
          quantity?: number
          service_id?: string | null
          unit_price?: number
          user_id?: string
        }
        Relationships: []
      }
      combo_sales: {
        Row: {
          amount: number
          client_id: string | null
          combo_id: string
          created_at: string
          financial_id: string | null
          id: string
          sold_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          client_id?: string | null
          combo_id: string
          created_at?: string
          financial_id?: string | null
          id?: string
          sold_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          combo_id?: string
          created_at?: string
          financial_id?: string | null
          id?: string
          sold_at?: string
          user_id?: string
        }
        Relationships: []
      }
      combos: {
        Row: {
          color: string | null
          combo_price: number
          created_at: string
          deleted_at: string | null
          description: string | null
          ends_at: string | null
          id: string
          name: string
          original_price: number
          starts_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          combo_price?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          name: string
          original_price?: number
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          combo_price?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          name?: string
          original_price?: number
          starts_at?: string | null
          status?: string
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
          interest_type: string
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
          interest_type?: string
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
          interest_type?: string
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
      deliveries: {
        Row: {
          assembler_id: string | null
          client_id: string | null
          commission_percent: number | null
          commission_status: string | null
          commission_value: number | null
          created_at: string
          delivered_at: string | null
          destination_address: string
          distance_km: number | null
          financial_id: string | null
          id: string
          is_pickup: boolean
          items: Json
          max_delivery_date: string | null
          mounted_at: string | null
          needs_assembly: boolean
          needs_pickup: boolean
          notes: string | null
          pickup_address: string | null
          route_order: number | null
          scheduled_for: string | null
          sent_to_assembler_at: string | null
          status: string
          stock_available_at_sale: boolean | null
          supplier_delivery_days: number | null
          supplier_expected_date: string | null
          supplier_id: string | null
          supplier_manufacturing_days: number | null
          supplier_notes: string | null
          supplier_order_date: string | null
          supplier_received_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assembler_id?: string | null
          client_id?: string | null
          commission_percent?: number | null
          commission_status?: string | null
          commission_value?: number | null
          created_at?: string
          delivered_at?: string | null
          destination_address: string
          distance_km?: number | null
          financial_id?: string | null
          id?: string
          is_pickup?: boolean
          items?: Json
          max_delivery_date?: string | null
          mounted_at?: string | null
          needs_assembly?: boolean
          needs_pickup?: boolean
          notes?: string | null
          pickup_address?: string | null
          route_order?: number | null
          scheduled_for?: string | null
          sent_to_assembler_at?: string | null
          status?: string
          stock_available_at_sale?: boolean | null
          supplier_delivery_days?: number | null
          supplier_expected_date?: string | null
          supplier_id?: string | null
          supplier_manufacturing_days?: number | null
          supplier_notes?: string | null
          supplier_order_date?: string | null
          supplier_received_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assembler_id?: string | null
          client_id?: string | null
          commission_percent?: number | null
          commission_status?: string | null
          commission_value?: number | null
          created_at?: string
          delivered_at?: string | null
          destination_address?: string
          distance_km?: number | null
          financial_id?: string | null
          id?: string
          is_pickup?: boolean
          items?: Json
          max_delivery_date?: string | null
          mounted_at?: string | null
          needs_assembly?: boolean
          needs_pickup?: boolean
          notes?: string | null
          pickup_address?: string | null
          route_order?: number | null
          scheduled_for?: string | null
          sent_to_assembler_at?: string | null
          status?: string
          stock_available_at_sale?: boolean | null
          supplier_delivery_days?: number | null
          supplier_expected_date?: string | null
          supplier_id?: string | null
          supplier_manufacturing_days?: number | null
          supplier_notes?: string | null
          supplier_order_date?: string | null
          supplier_received_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial: {
        Row: {
          cash_received: number | null
          category: string | null
          change_amount: number | null
          client_id: string | null
          created_at: string
          delivery_fee: number
          description: string | null
          fee_amount: number | null
          fee_percent: number | null
          gross_amount: number
          has_local_stock: boolean | null
          id: string
          installments: number | null
          is_duplicate: boolean
          items: Json
          needs_assembly: boolean
          needs_delivery: boolean
          net_amount: number
          origin: string | null
          origin_id: string | null
          payment_method: string | null
          payment_method_id: string | null
          production_status: string | null
          quote_id: string | null
          supplier_id: string | null
          transaction_date: string
          type: string
          user_id: string
          variation_id: string | null
        }
        Insert: {
          cash_received?: number | null
          category?: string | null
          change_amount?: number | null
          client_id?: string | null
          created_at?: string
          delivery_fee?: number
          description?: string | null
          fee_amount?: number | null
          fee_percent?: number | null
          gross_amount?: number
          has_local_stock?: boolean | null
          id?: string
          installments?: number | null
          is_duplicate?: boolean
          items?: Json
          needs_assembly?: boolean
          needs_delivery?: boolean
          net_amount?: number
          origin?: string | null
          origin_id?: string | null
          payment_method?: string | null
          payment_method_id?: string | null
          production_status?: string | null
          quote_id?: string | null
          supplier_id?: string | null
          transaction_date?: string
          type: string
          user_id: string
          variation_id?: string | null
        }
        Update: {
          cash_received?: number | null
          category?: string | null
          change_amount?: number | null
          client_id?: string | null
          created_at?: string
          delivery_fee?: number
          description?: string | null
          fee_amount?: number | null
          fee_percent?: number | null
          gross_amount?: number
          has_local_stock?: boolean | null
          id?: string
          installments?: number | null
          is_duplicate?: boolean
          items?: Json
          needs_assembly?: boolean
          needs_delivery?: boolean
          net_amount?: number
          origin?: string | null
          origin_id?: string | null
          payment_method?: string | null
          payment_method_id?: string | null
          production_status?: string | null
          quote_id?: string | null
          supplier_id?: string | null
          transaction_date?: string
          type?: string
          user_id?: string
          variation_id?: string | null
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
      legal_pages: {
        Row: {
          created_at: string
          generated_by: string | null
          html_content: string
          id: string
          page_type: string
          published: boolean
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          generated_by?: string | null
          html_content: string
          id?: string
          page_type: string
          published?: boolean
          title: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          generated_by?: string | null
          html_content?: string
          id?: string
          page_type?: string
          published?: boolean
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
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
          recurrence_type: string
          sessions_total: number
          sessions_used: number
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
          recurrence_type?: string
          sessions_total?: number
          sessions_used?: number
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
          recurrence_type?: string
          sessions_total?: number
          sessions_used?: number
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
      payment_methods: {
        Row: {
          active: boolean
          code: string
          created_at: string
          fee_fixed: number
          fee_percent: number
          id: string
          installments: number
          label: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          fee_fixed?: number
          fee_percent?: number
          id?: string
          installments?: number
          label: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          fee_fixed?: number
          fee_percent?: number
          id?: string
          installments?: number
          label?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      product_variations: {
        Row: {
          attributes: Json
          cost: number
          created_at: string
          id: string
          image_url: string | null
          name: string
          product_id: string
          sale_price: number
          status: string
          stock: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attributes?: Json
          cost?: number
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          product_id: string
          sale_price?: number
          status?: string
          stock?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attributes?: Json
          cost?: number
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          product_id?: string
          sale_price?: number
          status?: string
          stock?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          category_id: string | null
          code: string | null
          cost: number | null
          created_at: string
          deleted_at: string | null
          id: string
          image_url: string | null
          is_ingredient_residue: boolean
          margin_percent: number | null
          markup_percent: number | null
          measurements: Json | null
          min_stock: number
          name: string
          out_of_line: boolean
          sale_price: number
          status: string
          stock: number
          supplier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          code?: string | null
          cost?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_ingredient_residue?: boolean
          margin_percent?: number | null
          markup_percent?: number | null
          measurements?: Json | null
          min_stock?: number
          name: string
          out_of_line?: boolean
          sale_price?: number
          status?: string
          stock?: number
          supplier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          category_id?: string | null
          code?: string | null
          cost?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_ingredient_residue?: boolean
          margin_percent?: number | null
          markup_percent?: number | null
          measurements?: Json | null
          min_stock?: number
          name?: string
          out_of_line?: boolean
          sale_price?: number
          status?: string
          stock?: number
          supplier_id?: string | null
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
          dashboard_widgets: Json
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
          dashboard_widgets?: Json
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
          dashboard_widgets?: Json
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
      quick_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          resolved: boolean
          resolved_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          created_at: string
          id: string
          margin_percent: number
          notes: string | null
          product_id: string | null
          quantity: number
          quote_id: string
          unit_cost: number
          unit_price: number
          user_id: string
          variation_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          margin_percent?: number
          notes?: string | null
          product_id?: string | null
          quantity?: number
          quote_id: string
          unit_cost?: number
          unit_price?: number
          user_id: string
          variation_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          margin_percent?: number
          notes?: string | null
          product_id?: string | null
          quantity?: number
          quote_id?: string
          unit_cost?: number
          unit_price?: number
          user_id?: string
          variation_id?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          client_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          installments: number | null
          notes: string | null
          payment_method: string | null
          status: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          installments?: number | null
          notes?: string | null
          payment_method?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          installments?: number | null
          notes?: string | null
          payment_method?: string | null
          status?: string
          total?: number
          updated_at?: string
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
      supplier_catalogs: {
        Row: {
          chunk_index: number | null
          created_at: string
          error_message: string | null
          filename: string
          id: string
          internal_only: boolean
          kind: string
          mime: string | null
          page_end: number | null
          page_start: number | null
          parent_id: string | null
          processed_pages: number
          processing_status: string
          products_created: number
          products_updated: number
          size_bytes: number | null
          storage_path: string
          supplier_id: string
          total_pages: number | null
          user_id: string
        }
        Insert: {
          chunk_index?: number | null
          created_at?: string
          error_message?: string | null
          filename: string
          id?: string
          internal_only?: boolean
          kind?: string
          mime?: string | null
          page_end?: number | null
          page_start?: number | null
          parent_id?: string | null
          processed_pages?: number
          processing_status?: string
          products_created?: number
          products_updated?: number
          size_bytes?: number | null
          storage_path: string
          supplier_id: string
          total_pages?: number | null
          user_id: string
        }
        Update: {
          chunk_index?: number | null
          created_at?: string
          error_message?: string | null
          filename?: string
          id?: string
          internal_only?: boolean
          kind?: string
          mime?: string | null
          page_end?: number | null
          page_start?: number | null
          parent_id?: string | null
          processed_pages?: number
          processing_status?: string
          products_created?: number
          products_updated?: number
          size_bytes?: number | null
          storage_path?: string
          supplier_id?: string
          total_pages?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_catalogs_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "supplier_catalogs"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_commands: {
        Row: {
          affected_count: number
          command: string
          created_at: string
          id: string
          result: Json
          supplier_id: string
          user_id: string
        }
        Insert: {
          affected_count?: number
          command: string
          created_at?: string
          id?: string
          result?: Json
          supplier_id: string
          user_id: string
        }
        Update: {
          affected_count?: number
          command?: string
          created_at?: string
          id?: string
          result?: Json
          supplier_id?: string
          user_id?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          avg_delivery_days: number | null
          catalog_url: string | null
          cnpj: string | null
          contact_name: string | null
          cost_fee_percent: number
          created_at: string
          default_margin_percent: number
          default_markup_percent: number
          deleted_at: string | null
          email: string | null
          full_address: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          pricing_rules: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          avg_delivery_days?: number | null
          catalog_url?: string | null
          cnpj?: string | null
          contact_name?: string | null
          cost_fee_percent?: number
          created_at?: string
          default_margin_percent?: number
          default_markup_percent?: number
          deleted_at?: string | null
          email?: string | null
          full_address?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          pricing_rules?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          avg_delivery_days?: number | null
          catalog_url?: string | null
          cnpj?: string | null
          contact_name?: string | null
          cost_fee_percent?: number
          created_at?: string
          default_margin_percent?: number
          default_markup_percent?: number
          deleted_at?: string | null
          email?: string | null
          full_address?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          pricing_rules?: Json
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
      tenant_integrations: {
        Row: {
          connected_at: string | null
          created_at: string
          credentials: Json
          id: string
          metadata: Json
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          credentials?: Json
          id?: string
          metadata?: Json
          provider: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          credentials?: Json
          id?: string
          metadata?: Json
          provider?: string
          status?: string
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
      seed_default_categories: {
        Args: { _niche: string; _user_id: string }
        Returns: undefined
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
