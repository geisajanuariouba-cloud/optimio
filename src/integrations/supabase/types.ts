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
      alerts: {
        Row: {
          created_at: string
          description: string | null
          entity_id: string | null
          entity_table: string | null
          id: string
          kind: string
          metadata: Json
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_table?: string | null
          id?: string
          kind: string
          metadata?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_table?: string | null
          id?: string
          kind?: string
          metadata?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      appointment_services: {
        Row: {
          appointment_id: string
          created_at: string
          duration_min: number
          id: string
          name: string | null
          price: number
          qty: number
          service_id: string | null
          sort_order: number
          user_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          duration_min?: number
          id?: string
          name?: string | null
          price?: number
          qty?: number
          service_id?: string | null
          sort_order?: number
          user_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          duration_min?: number
          id?: string
          name?: string | null
          price?: number
          qty?: number
          service_id?: string | null
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_services_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
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
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          module: string | null
          owner_user_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          module?: string | null
          owner_user_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          module?: string | null
          owner_user_id?: string
        }
        Relationships: []
      }
      billing_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          provider: string
          raw_payload: Json
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          provider: string
          raw_payload?: Json
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          provider?: string
          raw_payload?: Json
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      card_machine_plans: {
        Row: {
          card_machine_id: string
          created_at: string
          ended_at: string | null
          id: string
          notes: string | null
          plan_name: string
          rates: Json
          started_at: string
          user_id: string
        }
        Insert: {
          card_machine_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          plan_name: string
          rates?: Json
          started_at?: string
          user_id: string
        }
        Update: {
          card_machine_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          plan_name?: string
          rates?: Json
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_machine_plans_card_machine_id_fkey"
            columns: ["card_machine_id"]
            isOneToOne: false
            referencedRelation: "card_machines"
            referencedColumns: ["id"]
          },
        ]
      }
      card_machines: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          notes: string | null
          operator: string | null
          plan_name: string | null
          rates: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          operator?: string | null
          plan_name?: string | null
          rates?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          operator?: string | null
          plan_name?: string | null
          rates?: Json
          updated_at?: string
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
          payment_method: string
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
          payment_method?: string
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
          payment_method?: string
          reason?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      catalog_review_items: {
        Row: {
          approve_with_image_pending: boolean | null
          catalog_id: string | null
          created_at: string
          dedup_hash: string | null
          id: string
          image_flagged: boolean | null
          match_product_id: string | null
          match_status: string
          proposed_category: string | null
          proposed_code: string | null
          proposed_image_url: string | null
          proposed_measurements: Json | null
          proposed_name: string | null
          proposed_variations: Json | null
          raw_data: Json
          rejection_reason: string | null
          review_status: string
          reviewer_notes: string | null
          source_page: number | null
          supplier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approve_with_image_pending?: boolean | null
          catalog_id?: string | null
          created_at?: string
          dedup_hash?: string | null
          id?: string
          image_flagged?: boolean | null
          match_product_id?: string | null
          match_status?: string
          proposed_category?: string | null
          proposed_code?: string | null
          proposed_image_url?: string | null
          proposed_measurements?: Json | null
          proposed_name?: string | null
          proposed_variations?: Json | null
          raw_data?: Json
          rejection_reason?: string | null
          review_status?: string
          reviewer_notes?: string | null
          source_page?: number | null
          supplier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approve_with_image_pending?: boolean | null
          catalog_id?: string | null
          created_at?: string
          dedup_hash?: string | null
          id?: string
          image_flagged?: boolean | null
          match_product_id?: string | null
          match_status?: string
          proposed_category?: string | null
          proposed_code?: string | null
          proposed_image_url?: string | null
          proposed_measurements?: Json | null
          proposed_name?: string | null
          proposed_variations?: Json | null
          raw_data?: Json
          rejection_reason?: string | null
          review_status?: string
          reviewer_notes?: string | null
          source_page?: number | null
          supplier_id?: string | null
          updated_at?: string
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
          last_contact_at: string | null
          notes: string | null
          phone: string | null
          responsible_user_id: string | null
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
          last_contact_at?: string | null
          notes?: string | null
          phone?: string | null
          responsible_user_id?: string | null
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
          last_contact_at?: string | null
          notes?: string | null
          phone?: string | null
          responsible_user_id?: string | null
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
          amount_paid: number
          created_at: string
          debt_id: string
          due_date: string
          id: string
          number: number
          paid_at: string | null
          payment_method: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          amount_paid?: number
          created_at?: string
          debt_id: string
          due_date: string
          id?: string
          number: number
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          amount_paid?: number
          created_at?: string
          debt_id?: string
          due_date?: string
          id?: string
          number?: number
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      debt_payments: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          created_by: string | null
          debt_id: string
          financial_id: string | null
          id: string
          installment_id: string | null
          note: string | null
          payment_date: string
          payment_method: string
          user_id: string
        }
        Insert: {
          amount?: number
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          debt_id: string
          financial_id?: string | null
          id?: string
          installment_id?: string | null
          note?: string | null
          payment_date?: string
          payment_method?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          debt_id?: string
          financial_id?: string | null
          id?: string
          installment_id?: string | null
          note?: string | null
          payment_date?: string
          payment_method?: string
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
      employee_shifts: {
        Row: {
          created_at: string
          end_time: string
          id: string
          member_name: string | null
          member_user_id: string | null
          owner_user_id: string
          start_time: string
          updated_at: string
          weekday: number
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          member_name?: string | null
          member_user_id?: string | null
          owner_user_id: string
          start_time: string
          updated_at?: string
          weekday: number
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          member_name?: string | null
          member_user_id?: string | null
          owner_user_id?: string
          start_time?: string
          updated_at?: string
          weekday?: number
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
          due_date: string | null
          fee_amount: number | null
          fee_percent: number | null
          gross_amount: number
          has_local_stock: boolean | null
          id: string
          installments: number | null
          interest_amount: number | null
          interest_percent: number | null
          interest_type: string | null
          is_duplicate: boolean
          is_fixed: boolean
          items: Json
          needs_assembly: boolean
          needs_delivery: boolean
          net_amount: number
          notes: string | null
          origin: string | null
          origin_id: string | null
          paid_at: string | null
          payment_method: string | null
          payment_method_id: string | null
          production_status: string | null
          quote_id: string | null
          recurrence: string
          status: string
          supplier_id: string | null
          total_manual: boolean | null
          total_with_interest: number | null
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
          due_date?: string | null
          fee_amount?: number | null
          fee_percent?: number | null
          gross_amount?: number
          has_local_stock?: boolean | null
          id?: string
          installments?: number | null
          interest_amount?: number | null
          interest_percent?: number | null
          interest_type?: string | null
          is_duplicate?: boolean
          is_fixed?: boolean
          items?: Json
          needs_assembly?: boolean
          needs_delivery?: boolean
          net_amount?: number
          notes?: string | null
          origin?: string | null
          origin_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_method_id?: string | null
          production_status?: string | null
          quote_id?: string | null
          recurrence?: string
          status?: string
          supplier_id?: string | null
          total_manual?: boolean | null
          total_with_interest?: number | null
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
          due_date?: string | null
          fee_amount?: number | null
          fee_percent?: number | null
          gross_amount?: number
          has_local_stock?: boolean | null
          id?: string
          installments?: number | null
          interest_amount?: number | null
          interest_percent?: number | null
          interest_type?: string | null
          is_duplicate?: boolean
          is_fixed?: boolean
          items?: Json
          needs_assembly?: boolean
          needs_delivery?: boolean
          net_amount?: number
          notes?: string | null
          origin?: string | null
          origin_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_method_id?: string | null
          production_status?: string | null
          quote_id?: string | null
          recurrence?: string
          status?: string
          supplier_id?: string | null
          total_manual?: boolean | null
          total_with_interest?: number | null
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
      knowledge_articles: {
        Row: {
          author_name: string | null
          category: string
          content: string
          created_at: string
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name?: string | null
          category: string
          content?: string
          created_at?: string
          id?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          client_id: string | null
          company: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          position: number
          potential_value: number
          responsible_user_id: string | null
          stage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          company?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          position?: number
          potential_value?: number
          responsible_user_id?: string | null
          stage?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          company?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          position?: number
          potential_value?: number
          responsible_user_id?: string | null
          stage?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      marketing_campaigns: {
        Row: {
          ai_generated: boolean
          audience: string | null
          budget: number | null
          channel: string
          content: Json
          created_at: string
          ends_at: string | null
          id: string
          metrics: Json
          name: string
          objective: string | null
          starts_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_generated?: boolean
          audience?: string | null
          budget?: number | null
          channel?: string
          content?: Json
          created_at?: string
          ends_at?: string | null
          id?: string
          metrics?: Json
          name: string
          objective?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_generated?: boolean
          audience?: string | null
          budget?: number | null
          channel?: string
          content?: Json
          created_at?: string
          ends_at?: string | null
          id?: string
          metrics?: Json
          name?: string
          objective?: string | null
          starts_at?: string | null
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
      marketplace_stock: {
        Row: {
          external_price: number | null
          external_sku: string | null
          id: string
          marketplace_id: string
          product_id: string
          reserved: number
          updated_at: string
          user_id: string
        }
        Insert: {
          external_price?: number | null
          external_sku?: string | null
          id?: string
          marketplace_id: string
          product_id: string
          reserved?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          external_price?: number | null
          external_sku?: string | null
          id?: string
          marketplace_id?: string
          product_id?: string
          reserved?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_stock_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "marketplaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplaces: {
        Row: {
          config: Json
          created_at: string
          id: string
          last_sync_at: string | null
          name: string
          platform: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          last_sync_at?: string | null
          name: string
          platform: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          last_sync_at?: string | null
          name?: string
          platform?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_status: {
        Row: {
          checklist: Json
          completed: boolean
          created_at: string
          current_step: string | null
          id: string
          niche: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          checklist?: Json
          completed?: boolean
          created_at?: string
          current_step?: string | null
          id?: string
          niche?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          checklist?: Json
          completed?: boolean
          created_at?: string
          current_step?: string | null
          id?: string
          niche?: string | null
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
      product_ideas: {
        Row: {
          category: string | null
          created_at: string
          estimated_margin: number | null
          id: string
          metadata: Json
          name: string
          potential_score: number | null
          reason: string | null
          source: string | null
          status: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          estimated_margin?: number | null
          id?: string
          metadata?: Json
          name: string
          potential_score?: number | null
          reason?: string | null
          source?: string | null
          status?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          estimated_margin?: number | null
          id?: string
          metadata?: Json
          name?: string
          potential_score?: number | null
          reason?: string | null
          source?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      product_recipes: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          raw_material_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          raw_material_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          raw_material_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipes_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variations: {
        Row: {
          attributes: Json
          codname: string | null
          color: string | null
          cost: number
          created_at: string
          depth: number | null
          engine_suggested_price: number | null
          fabric: string | null
          final_cost_price: number | null
          finish: string | null
          height: number | null
          id: string
          image_url: string | null
          last_cost_synced_at: string | null
          length_cm: number | null
          manual_price_override: boolean
          match_key_code: string | null
          match_key_name: string | null
          material: string | null
          measure_unit: string | null
          min_stock: number
          model: string | null
          name: string
          price_out_of_sync: boolean
          pricing_mode: string
          product_id: string
          sale_price: number
          size: string | null
          sku: string | null
          status: string
          stock: number
          supplier_id: string | null
          updated_at: string
          user_id: string
          variation_type: string | null
          weight: number | null
          width: number | null
        }
        Insert: {
          attributes?: Json
          codname?: string | null
          color?: string | null
          cost?: number
          created_at?: string
          depth?: number | null
          engine_suggested_price?: number | null
          fabric?: string | null
          final_cost_price?: number | null
          finish?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          last_cost_synced_at?: string | null
          length_cm?: number | null
          manual_price_override?: boolean
          match_key_code?: string | null
          match_key_name?: string | null
          material?: string | null
          measure_unit?: string | null
          min_stock?: number
          model?: string | null
          name: string
          price_out_of_sync?: boolean
          pricing_mode?: string
          product_id: string
          sale_price?: number
          size?: string | null
          sku?: string | null
          status?: string
          stock?: number
          supplier_id?: string | null
          updated_at?: string
          user_id: string
          variation_type?: string | null
          weight?: number | null
          width?: number | null
        }
        Update: {
          attributes?: Json
          codname?: string | null
          color?: string | null
          cost?: number
          created_at?: string
          depth?: number | null
          engine_suggested_price?: number | null
          fabric?: string | null
          final_cost_price?: number | null
          finish?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          last_cost_synced_at?: string | null
          length_cm?: number | null
          manual_price_override?: boolean
          match_key_code?: string | null
          match_key_name?: string | null
          material?: string | null
          measure_unit?: string | null
          min_stock?: number
          model?: string | null
          name?: string
          price_out_of_sync?: boolean
          pricing_mode?: string
          product_id?: string
          sale_price?: number
          size?: string | null
          sku?: string | null
          status?: string
          stock?: number
          supplier_id?: string | null
          updated_at?: string
          user_id?: string
          variation_type?: string | null
          weight?: number | null
          width?: number | null
        }
        Relationships: []
      }
      production_order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          quantity: number
          raw_material_id: string
          total_cost: number
          unit_cost: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          quantity: number
          raw_material_id: string
          total_cost?: number
          unit_cost?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          quantity?: number
          raw_material_id?: string
          total_cost?: number
          unit_cost?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_order_items_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      production_orders: {
        Row: {
          actual_cost: number
          created_at: string
          estimated_cost: number
          id: string
          notes: string | null
          produced_at: string | null
          product_id: string
          quantity: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_cost?: number
          created_at?: string
          estimated_cost?: number
          id?: string
          notes?: string | null
          produced_at?: string | null
          product_id: string
          quantity: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_cost?: number
          created_at?: string
          estimated_cost?: number
          id?: string
          notes?: string | null
          produced_at?: string | null
          product_id?: string
          quantity?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ai_category_suggestion: string | null
          category: string | null
          category_id: string | null
          code: string | null
          codname: string | null
          cost: number | null
          created_at: string
          dedup_hash: string | null
          deleted_at: string | null
          depth: number | null
          description: string | null
          engine_suggested_price: number | null
          final_cost_price: number | null
          has_variations: boolean
          height: number | null
          id: string
          image_review_required: boolean
          image_url: string | null
          is_ingredient_residue: boolean
          last_cost_synced_at: string | null
          length_cm: number | null
          manual_price_override: boolean
          margin_percent: number | null
          markup_percent: number | null
          match_key_code: string | null
          match_key_name: string | null
          measure_unit: string | null
          measurements: Json | null
          min_stock: number
          name: string
          out_of_line: boolean
          price_out_of_sync: boolean
          pricing_mode: string
          product_type: string | null
          review_status: string | null
          sale_price: number
          source_catalog_id: string | null
          status: string
          stock: number
          supplier_id: string | null
          updated_at: string
          user_id: string
          weight: number | null
          width: number | null
        }
        Insert: {
          ai_category_suggestion?: string | null
          category?: string | null
          category_id?: string | null
          code?: string | null
          codname?: string | null
          cost?: number | null
          created_at?: string
          dedup_hash?: string | null
          deleted_at?: string | null
          depth?: number | null
          description?: string | null
          engine_suggested_price?: number | null
          final_cost_price?: number | null
          has_variations?: boolean
          height?: number | null
          id?: string
          image_review_required?: boolean
          image_url?: string | null
          is_ingredient_residue?: boolean
          last_cost_synced_at?: string | null
          length_cm?: number | null
          manual_price_override?: boolean
          margin_percent?: number | null
          markup_percent?: number | null
          match_key_code?: string | null
          match_key_name?: string | null
          measure_unit?: string | null
          measurements?: Json | null
          min_stock?: number
          name: string
          out_of_line?: boolean
          price_out_of_sync?: boolean
          pricing_mode?: string
          product_type?: string | null
          review_status?: string | null
          sale_price?: number
          source_catalog_id?: string | null
          status?: string
          stock?: number
          supplier_id?: string | null
          updated_at?: string
          user_id: string
          weight?: number | null
          width?: number | null
        }
        Update: {
          ai_category_suggestion?: string | null
          category?: string | null
          category_id?: string | null
          code?: string | null
          codname?: string | null
          cost?: number | null
          created_at?: string
          dedup_hash?: string | null
          deleted_at?: string | null
          depth?: number | null
          description?: string | null
          engine_suggested_price?: number | null
          final_cost_price?: number | null
          has_variations?: boolean
          height?: number | null
          id?: string
          image_review_required?: boolean
          image_url?: string | null
          is_ingredient_residue?: boolean
          last_cost_synced_at?: string | null
          length_cm?: number | null
          manual_price_override?: boolean
          margin_percent?: number | null
          markup_percent?: number | null
          match_key_code?: string | null
          match_key_name?: string | null
          measure_unit?: string | null
          measurements?: Json | null
          min_stock?: number
          name?: string
          out_of_line?: boolean
          price_out_of_sync?: boolean
          pricing_mode?: string
          product_type?: string | null
          review_status?: string | null
          sale_price?: number
          source_catalog_id?: string | null
          status?: string
          stock?: number
          supplier_id?: string | null
          updated_at?: string
          user_id?: string
          weight?: number | null
          width?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accent_color: string | null
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
          is_admin_master: boolean
          logo_palette: Json
          logo_url: string | null
          niche: string
          onboarding_completed: boolean
          operational_cycle_start_day: number
          payment_fees: Json
          phone_number: string | null
          plan: string
          primary_color: string
          remember_me: boolean | null
          secondary_color: string | null
          support_button_position: string | null
          support_button_visible: boolean | null
          terms: Json
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
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
          is_admin_master?: boolean
          logo_palette?: Json
          logo_url?: string | null
          niche?: string
          onboarding_completed?: boolean
          operational_cycle_start_day?: number
          payment_fees?: Json
          phone_number?: string | null
          plan?: string
          primary_color?: string
          remember_me?: boolean | null
          secondary_color?: string | null
          support_button_position?: string | null
          support_button_visible?: boolean | null
          terms?: Json
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
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
          is_admin_master?: boolean
          logo_palette?: Json
          logo_url?: string | null
          niche?: string
          onboarding_completed?: boolean
          operational_cycle_start_day?: number
          payment_fees?: Json
          phone_number?: string | null
          plan?: string
          primary_color?: string
          remember_me?: boolean | null
          secondary_color?: string | null
          support_button_position?: string | null
          support_button_visible?: boolean | null
          terms?: Json
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          checklist: Json
          comments: Json
          created_at: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          name: string
          progress: number
          responsible_user_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checklist?: Json
          comments?: Json
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          progress?: number
          responsible_user_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checklist?: Json
          comments?: Json
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          progress?: number
          responsible_user_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
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
          category: string | null
          created_at: string
          extra_fee_percent: number | null
          final_cost: number | null
          id: string
          image_url: string | null
          item_type: string | null
          margin_percent: number
          markup_percent: number | null
          measurements_snapshot: Json | null
          name: string | null
          notes: string | null
          product_id: string | null
          quantity: number
          quote_id: string
          service_id: string | null
          sku: string | null
          subtotal: number | null
          supplier_id: string | null
          supplier_name: string | null
          unit_cost: number
          unit_price: number
          user_id: string
          variation_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          extra_fee_percent?: number | null
          final_cost?: number | null
          id?: string
          image_url?: string | null
          item_type?: string | null
          margin_percent?: number
          markup_percent?: number | null
          measurements_snapshot?: Json | null
          name?: string | null
          notes?: string | null
          product_id?: string | null
          quantity?: number
          quote_id: string
          service_id?: string | null
          sku?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          unit_cost?: number
          unit_price?: number
          user_id: string
          variation_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          extra_fee_percent?: number | null
          final_cost?: number | null
          id?: string
          image_url?: string | null
          item_type?: string | null
          margin_percent?: number
          markup_percent?: number | null
          measurements_snapshot?: Json | null
          name?: string | null
          notes?: string | null
          product_id?: string | null
          quantity?: number
          quote_id?: string
          service_id?: string | null
          sku?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
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
      raw_material_purchases: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          purchased_at: string
          quantity: number
          raw_material_id: string
          supplier_id: string | null
          total_cost: number | null
          unit_cost: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          purchased_at?: string
          quantity: number
          raw_material_id: string
          supplier_id?: string | null
          total_cost?: number | null
          unit_cost: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          purchased_at?: string
          quantity?: number
          raw_material_id?: string
          supplier_id?: string | null
          total_cost?: number | null
          unit_cost?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_material_purchases_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_material_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_materials: {
        Row: {
          average_cost: number
          created_at: string
          current_cost: number
          id: string
          last_cost: number
          min_stock: number
          name: string
          notes: string | null
          stock: number
          supplier_id: string | null
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          average_cost?: number
          created_at?: string
          current_cost?: number
          id?: string
          last_cost?: number
          min_stock?: number
          name: string
          notes?: string | null
          stock?: number
          supplier_id?: string | null
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          average_cost?: number
          created_at?: string
          current_cost?: number
          id?: string
          last_cost?: number
          min_stock?: number
          name?: string
          notes?: string | null
          stock?: number
          supplier_id?: string | null
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
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
      role_templates: {
        Row: {
          area: string | null
          created_at: string
          id: string
          name: string
          owner_user_id: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          area?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          permissions?: Json
          updated_at?: string
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
      stock_movements: {
        Row: {
          created_at: string
          id: string
          movement_type: string
          product_id: string | null
          quantity: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          unit_cost: number | null
          user_id: string
          variation_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          movement_type: string
          product_id?: string | null
          quantity: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
          user_id: string
          variation_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          movement_type?: string
          product_id?: string | null
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
          user_id?: string
          variation_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string
          current_period_start: string | null
          id: string
          internal_plan: string | null
          last_paid_at: string | null
          plan_slug: string
          provider: string | null
          provider_customer_id: string | null
          provider_plan_name: string | null
          provider_product_id: string | null
          provider_subscription_id: string | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string | null
          id?: string
          internal_plan?: string | null
          last_paid_at?: string | null
          plan_slug: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_plan_name?: string | null
          provider_product_id?: string | null
          provider_subscription_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string | null
          id?: string
          internal_plan?: string | null
          last_paid_at?: string | null
          plan_slug?: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_plan_name?: string | null
          provider_product_id?: string | null
          provider_subscription_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      supplier_catalog_chunks: {
        Row: {
          catalog_id: string
          chunk_index: number
          completed_at: string | null
          created_at: string
          error_message: string | null
          extracted_products: Json
          id: string
          last_heartbeat_at: string
          page_end: number | null
          page_start: number | null
          pages: number
          products_extracted: number
          started_at: string | null
          status: string
          storage_path: string
          supplier_id: string
          user_id: string
        }
        Insert: {
          catalog_id: string
          chunk_index: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          extracted_products?: Json
          id?: string
          last_heartbeat_at?: string
          page_end?: number | null
          page_start?: number | null
          pages?: number
          products_extracted?: number
          started_at?: string | null
          status?: string
          storage_path: string
          supplier_id: string
          user_id: string
        }
        Update: {
          catalog_id?: string
          chunk_index?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          extracted_products?: Json
          id?: string
          last_heartbeat_at?: string
          page_end?: number | null
          page_start?: number | null
          pages?: number
          products_extracted?: number
          started_at?: string | null
          status?: string
          storage_path?: string
          supplier_id?: string
          user_id?: string
        }
        Relationships: []
      }
      supplier_catalogs: {
        Row: {
          chunk_index: number | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          filename: string
          id: string
          internal_only: boolean
          items_pending_review: number | null
          kind: string
          last_heartbeat_at: string
          mime: string | null
          page_end: number | null
          page_start: number | null
          parent_id: string | null
          partial_reason: string | null
          processed_chunks: number
          processed_pages: number
          processing_logs: Json
          processing_stage: string
          processing_status: string
          products_created: number
          products_extracted: number
          products_updated: number
          review_required: boolean | null
          size_bytes: number | null
          storage_path: string
          supplier_id: string
          total_chunks: number
          total_pages: number | null
          user_id: string
        }
        Insert: {
          chunk_index?: number | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          filename: string
          id?: string
          internal_only?: boolean
          items_pending_review?: number | null
          kind?: string
          last_heartbeat_at?: string
          mime?: string | null
          page_end?: number | null
          page_start?: number | null
          parent_id?: string | null
          partial_reason?: string | null
          processed_chunks?: number
          processed_pages?: number
          processing_logs?: Json
          processing_stage?: string
          processing_status?: string
          products_created?: number
          products_extracted?: number
          products_updated?: number
          review_required?: boolean | null
          size_bytes?: number | null
          storage_path: string
          supplier_id: string
          total_chunks?: number
          total_pages?: number | null
          user_id: string
        }
        Update: {
          chunk_index?: number | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          filename?: string
          id?: string
          internal_only?: boolean
          items_pending_review?: number | null
          kind?: string
          last_heartbeat_at?: string
          mime?: string | null
          page_end?: number | null
          page_start?: number | null
          parent_id?: string | null
          partial_reason?: string | null
          processed_chunks?: number
          processed_pages?: number
          processing_logs?: Json
          processing_stage?: string
          processing_status?: string
          products_created?: number
          products_extracted?: number
          products_updated?: number
          review_required?: boolean | null
          size_bytes?: number | null
          storage_path?: string
          supplier_id?: string
          total_chunks?: number
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
          auto_out_of_line: boolean
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
          auto_out_of_line?: boolean
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
          auto_out_of_line?: boolean
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
      system_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          owner_user_id: string | null
          scope: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          owner_user_id?: string | null
          scope?: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          owner_user_id?: string | null
          scope?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          author_user_id: string
          content: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          author_user_id: string
          content: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          author_user_id?: string
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          ai_generated: boolean
          assignee_user_id: string | null
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          linked_post_id: string | null
          metadata: Json
          parent_task_id: string | null
          priority: string
          recurrence: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_generated?: boolean
          assignee_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          linked_post_id?: string | null
          metadata?: Json
          parent_task_id?: string | null
          priority?: string
          recurrence?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_generated?: boolean
          assignee_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          linked_post_id?: string | null
          metadata?: Json
          parent_task_id?: string | null
          priority?: string
          recurrence?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_invites: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          owner_user_id: string
          permissions: Json
          role: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          owner_user_id: string
          permissions?: Json
          role?: string
          status?: string
          token: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          owner_user_id?: string
          permissions?: Json
          role?: string
          status?: string
          token?: string
        }
        Relationships: []
      }
      team_meetings: {
        Row: {
          action_items: Json
          agenda: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          participants: Json
          scheduled_for: string | null
          scope: string
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_items?: Json
          agenda?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          participants?: Json
          scheduled_for?: string | null
          scope?: string
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_items?: Json
          agenda?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          participants?: Json
          scheduled_for?: string | null
          scope?: string
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          area: string | null
          created_at: string
          email: string | null
          hire_date: string | null
          id: string
          invited_by: string | null
          member_user_id: string
          name: string | null
          owner_user_id: string
          permissions: Json
          phone: string | null
          position: string | null
          role: string
          salary: number | null
          status: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          email?: string | null
          hire_date?: string | null
          id?: string
          invited_by?: string | null
          member_user_id: string
          name?: string | null
          owner_user_id: string
          permissions?: Json
          phone?: string | null
          position?: string | null
          role?: string
          salary?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          created_at?: string
          email?: string | null
          hire_date?: string | null
          id?: string
          invited_by?: string | null
          member_user_id?: string
          name?: string | null
          owner_user_id?: string
          permissions?: Json
          phone?: string | null
          position?: string | null
          role?: string
          salary?: number | null
          status?: string
          updated_at?: string
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
      user_dashboard_prefs: {
        Row: {
          hidden_widgets: Json
          updated_at: string
          user_id: string
          widget_order: Json
        }
        Insert: {
          hidden_widgets?: Json
          updated_at?: string
          user_id: string
          widget_order?: Json
        }
        Update: {
          hidden_widgets?: Json
          updated_at?: string
          user_id?: string
          widget_order?: Json
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
      apply_engine_price: {
        Args: { _force?: boolean; _id: string; _kind: string }
        Returns: number
      }
      current_tenant_owner: { Args: never; Returns: string }
      engine_compute_sale: {
        Args: { _cost: number; _supplier_id: string }
        Returns: number
      }
      execute_production_order: { Args: { _order_id: string }; Returns: Json }
      generate_codname: {
        Args: { _color?: string; _name: string; _size?: string }
        Returns: string
      }
      has_permission: {
        Args: { _key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_supplier_out_of_line: {
        Args: { _since: string; _supplier_id: string }
        Returns: number
      }
      normalize_match: { Args: { _s: string }; Returns: string }
      recover_stuck_catalogs: { Args: { _user_id: string }; Returns: number }
      restore_tenant_data: { Args: never; Returns: Json }
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
