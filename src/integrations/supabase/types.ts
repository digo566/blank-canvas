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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts_payable: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          due_date: string
          id: string
          paid_date: string | null
          restaurant_id: string
          status: string
          supplier_name: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          paid_date?: string | null
          restaurant_id: string
          status?: string
          supplier_name: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          paid_date?: string | null
          restaurant_id?: string
          status?: string
          supplier_name?: string
        }
        Relationships: []
      }
      accounts_receivable: {
        Row: {
          amount: number
          client_name: string
          created_at: string | null
          description: string | null
          due_date: string
          id: string
          received_date: string | null
          restaurant_id: string
          status: string
        }
        Insert: {
          amount: number
          client_name: string
          created_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          received_date?: string | null
          restaurant_id: string
          status?: string
        }
        Update: {
          amount?: number
          client_name?: string
          created_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          received_date?: string | null
          restaurant_id?: string
          status?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          content: string
          created_at: string | null
          id: string
          restaurant_id: string
          role: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          restaurant_id: string
          role: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          restaurant_id?: string
          role?: string
        }
        Relationships: []
      }
      analytics_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_read: boolean | null
          is_resolved: boolean | null
          message: string
          metric_value: number | null
          resolved_at: string | null
          restaurant_id: string
          severity: string
          threshold_value: number | null
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message: string
          metric_value?: number | null
          resolved_at?: string | null
          restaurant_id: string
          severity: string
          threshold_value?: number | null
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message?: string
          metric_value?: number | null
          resolved_at?: string | null
          restaurant_id?: string
          severity?: string
          threshold_value?: number | null
          title?: string
        }
        Relationships: []
      }
      analytics_predictions: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          predicted_value: number
          prediction_date: string
          prediction_type: string
          restaurant_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          predicted_value: number
          prediction_date: string
          prediction_type: string
          restaurant_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          predicted_value?: number
          prediction_date?: string
          prediction_type?: string
          restaurant_id?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string | null
          id: string
          product_id: string
          quantity: number
        }
        Insert: {
          cart_id: string
          created_at?: string | null
          id?: string
          product_id: string
          quantity?: number
        }
        Update: {
          cart_id?: string
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          abandoned_at: string | null
          client_id: string
          contacted: boolean | null
          created_at: string | null
          id: string
          is_abandoned: boolean | null
          restaurant_id: string
          updated_at: string | null
        }
        Insert: {
          abandoned_at?: string | null
          client_id: string
          contacted?: boolean | null
          created_at?: string | null
          id?: string
          is_abandoned?: boolean | null
          restaurant_id: string
          updated_at?: string | null
        }
        Update: {
          abandoned_at?: string | null
          client_id?: string
          contacted?: boolean | null
          created_at?: string | null
          id?: string
          is_abandoned?: boolean | null
          restaurant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          is_registered: boolean | null
          name: string
          notes: string | null
          password_hash: string | null
          phone: string
          restaurant_id: string
          tags: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_registered?: boolean | null
          name: string
          notes?: string | null
          password_hash?: string | null
          phone: string
          restaurant_id: string
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_registered?: boolean | null
          name?: string
          notes?: string | null
          password_hash?: string | null
          phone?: string
          restaurant_id?: string
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number | null
          restaurant_id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          restaurant_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          restaurant_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          created_at: string | null
          delivery_fee: number
          id: string
          is_active: boolean
          neighborhood_name: string
          restaurant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_fee?: number
          id?: string
          is_active?: boolean
          neighborhood_name: string
          restaurant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_fee?: number
          id?: string
          is_active?: boolean
          neighborhood_name?: string
          restaurant_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          restaurant_id: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          restaurant_id: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          restaurant_id?: string
          type?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          description: string | null
          expense_date: string
          id: string
          is_recurring: boolean | null
          recurring_day: number | null
          restaurant_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          is_recurring?: boolean | null
          recurring_day?: number | null
          restaurant_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          is_recurring?: boolean | null
          recurring_day?: number | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_summaries: {
        Row: {
          avg_ticket: number | null
          created_at: string | null
          gross_profit: number | null
          health_score: number | null
          id: string
          net_profit: number | null
          period_end: string
          period_start: string
          period_type: string
          restaurant_id: string
          total_expenses: number | null
          total_orders: number | null
          total_revenue: number | null
        }
        Insert: {
          avg_ticket?: number | null
          created_at?: string | null
          gross_profit?: number | null
          health_score?: number | null
          id?: string
          net_profit?: number | null
          period_end: string
          period_start: string
          period_type: string
          restaurant_id: string
          total_expenses?: number | null
          total_orders?: number | null
          total_revenue?: number | null
        }
        Update: {
          avg_ticket?: number | null
          created_at?: string | null
          gross_profit?: number | null
          health_score?: number | null
          id?: string
          net_profit?: number | null
          period_end?: string
          period_start?: string
          period_type?: string
          restaurant_id?: string
          total_expenses?: number | null
          total_orders?: number | null
          total_revenue?: number | null
        }
        Relationships: []
      }
      interactions: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          message: string
          restaurant_id: string
          type: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          restaurant_id: string
          type: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          restaurant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          avg_daily_consumption: number | null
          created_at: string | null
          current_quantity: number
          id: string
          ingredient_name: string | null
          last_purchase_date: string | null
          min_quantity: number
          product_id: string | null
          restaurant_id: string
          unit: string
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          avg_daily_consumption?: number | null
          created_at?: string | null
          current_quantity?: number
          id?: string
          ingredient_name?: string | null
          last_purchase_date?: string | null
          min_quantity?: number
          product_id?: string | null
          restaurant_id: string
          unit?: string
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_daily_consumption?: number | null
          created_at?: string | null
          current_quantity?: number
          id?: string
          ingredient_name?: string | null
          last_purchase_date?: string | null
          min_quantity?: number
          product_id?: string | null
          restaurant_id?: string
          unit?: string
          unit_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string | null
          id: string
          inventory_id: string
          movement_type: string
          quantity: number
          reason: string | null
          restaurant_id: string
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_id: string
          movement_type: string
          quantity: number
          reason?: string | null
          restaurant_id: string
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_id?: string
          movement_type?: string
          quantity?: number
          reason?: string | null
          restaurant_id?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          notes: string | null
          restaurant_name: string
          status: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          notes?: string | null
          restaurant_name: string
          status?: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          restaurant_name?: string
          status?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      loyalty_config: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean
          restaurant_id: string
          reward_description: string | null
          reward_type: string
          reward_value: number
          spend_threshold: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean
          restaurant_id: string
          reward_description?: string | null
          reward_type?: string
          reward_value?: number
          spend_threshold?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean
          restaurant_id?: string
          reward_description?: string | null
          reward_type?: string
          reward_value?: number
          spend_threshold?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      loyalty_progress: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          phone: string
          restaurant_id: string
          rewards_earned: number
          rewards_redeemed: number
          total_spent: number
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          phone: string
          restaurant_id: string
          rewards_earned?: number
          rewards_redeemed?: number
          total_spent?: number
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          phone?: string
          restaurant_id?: string
          rewards_earned?: number
          rewards_redeemed?: number
          total_spent?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_progress_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_options: {
        Row: {
          created_at: string | null
          id: string
          option_item_id: string
          option_item_name: string
          order_item_id: string
          price_modifier: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_item_id: string
          option_item_name: string
          order_item_id: string
          price_modifier?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          option_item_id?: string
          option_item_name?: string
          order_item_id?: string
          price_modifier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_item_options_option_item_id_fkey"
            columns: ["option_item_id"]
            isOneToOne: false
            referencedRelation: "product_option_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_options_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cart_id: string | null
          change_amount: number | null
          client_id: string | null
          coupon_discount: number | null
          coupon_id: string | null
          created_at: string | null
          delivered_at: string | null
          delivery_fee: number | null
          id: string
          needs_change: boolean | null
          notes: string | null
          payment_method: string | null
          preparation_started_at: string | null
          ready_at: string | null
          restaurant_id: string
          status: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
          tracking_code: string | null
          updated_at: string | null
        }
        Insert: {
          cart_id?: string | null
          change_amount?: number | null
          client_id?: string | null
          coupon_discount?: number | null
          coupon_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_fee?: number | null
          id?: string
          needs_change?: boolean | null
          notes?: string | null
          payment_method?: string | null
          preparation_started_at?: string | null
          ready_at?: string | null
          restaurant_id: string
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
          tracking_code?: string | null
          updated_at?: string | null
        }
        Update: {
          cart_id?: string | null
          change_amount?: number | null
          client_id?: string | null
          coupon_discount?: number | null
          coupon_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_fee?: number | null
          id?: string
          needs_change?: boolean | null
          notes?: string | null
          payment_method?: string | null
          preparation_started_at?: string | null
          ready_at?: string | null
          restaurant_id?: string
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number
          tracking_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_notas_fiscais: {
        Row: {
          company_cnpj: string | null
          company_name: string | null
          created_at: string | null
          customer_cpf: string | null
          customer_name: string | null
          data_venda: string
          descricao: string | null
          id: string
          order_id: string
          pdf_url: string | null
          restaurant_id: string
          valor_total: number
        }
        Insert: {
          company_cnpj?: string | null
          company_name?: string | null
          created_at?: string | null
          customer_cpf?: string | null
          customer_name?: string | null
          data_venda: string
          descricao?: string | null
          id?: string
          order_id: string
          pdf_url?: string | null
          restaurant_id: string
          valor_total: number
        }
        Update: {
          company_cnpj?: string | null
          company_name?: string | null
          created_at?: string | null
          customer_cpf?: string | null
          customer_name?: string | null
          data_venda?: string
          descricao?: string | null
          id?: string
          order_id?: string
          pdf_url?: string | null
          restaurant_id?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pre_notas_fiscais_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string | null
          name: string
          restaurant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          name: string
          restaurant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          name?: string
          restaurant_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_option_groups: {
        Row: {
          created_at: string | null
          id: string
          is_required: boolean | null
          max_selections: number | null
          min_selections: number | null
          name: string
          product_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          max_selections?: number | null
          min_selections?: number | null
          name: string
          product_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          max_selections?: number | null
          min_selections?: number | null
          name?: string
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_option_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_items: {
        Row: {
          created_at: string | null
          id: string
          name: string
          option_group_id: string
          price_modifier: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          option_group_id: string
          price_modifier?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          option_group_id?: string
          price_modifier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_option_items_option_group_id_fkey"
            columns: ["option_group_id"]
            isOneToOne: false
            referencedRelation: "product_option_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available: boolean | null
          category_id: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          profit_margin: number | null
          restaurant_id: string
          updated_at: string | null
        }
        Insert: {
          available?: boolean | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          profit_margin?: number | null
          restaurant_id: string
          updated_at?: string | null
        }
        Update: {
          available?: boolean | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          profit_margin?: number | null
          restaurant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cover_url: string | null
          created_at: string | null
          delivery_mode: string
          fiscal_cnpj: string | null
          fiscal_endereco: string | null
          fiscal_inscricao_municipal: string | null
          fiscal_nome_fantasia: string | null
          fiscal_razao_social: string | null
          id: string
          logo_url: string | null
          max_delivery_time: number | null
          min_delivery_time: number | null
          opening_hours: Json | null
          phone: string
          restaurant_name: string
          show_phone_publicly: boolean | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          delivery_mode?: string
          fiscal_cnpj?: string | null
          fiscal_endereco?: string | null
          fiscal_inscricao_municipal?: string | null
          fiscal_nome_fantasia?: string | null
          fiscal_razao_social?: string | null
          id: string
          logo_url?: string | null
          max_delivery_time?: number | null
          min_delivery_time?: number | null
          opening_hours?: Json | null
          phone: string
          restaurant_name: string
          show_phone_publicly?: boolean | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          delivery_mode?: string
          fiscal_cnpj?: string | null
          fiscal_endereco?: string | null
          fiscal_inscricao_municipal?: string | null
          fiscal_nome_fantasia?: string | null
          fiscal_razao_social?: string | null
          id?: string
          logo_url?: string | null
          max_delivery_time?: number | null
          min_delivery_time?: number | null
          opening_hours?: Json | null
          phone?: string
          restaurant_name?: string
          show_phone_publicly?: boolean | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          billing_type: string | null
          created_at: string | null
          cycle: string | null
          id: string
          next_due_date: string | null
          status: string
          updated_at: string | null
          user_id: string
          value: number
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          billing_type?: string | null
          created_at?: string | null
          cycle?: string | null
          id?: string
          next_due_date?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
          value?: number
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          billing_type?: string | null
          created_at?: string | null
          cycle?: string | null
          id?: string
          next_due_date?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      suggestion_feedback: {
        Row: {
          created_at: string
          feedback_comment: string | null
          id: string
          rating: number | null
          restaurant_id: string
          suggestion_text: string
          suggestion_type: string
          updated_at: string
          was_helpful: boolean | null
          was_implemented: boolean | null
        }
        Insert: {
          created_at?: string
          feedback_comment?: string | null
          id?: string
          rating?: number | null
          restaurant_id: string
          suggestion_text: string
          suggestion_type: string
          updated_at?: string
          was_helpful?: boolean | null
          was_implemented?: boolean | null
        }
        Update: {
          created_at?: string
          feedback_comment?: string | null
          id?: string
          rating?: number | null
          restaurant_id?: string
          suggestion_text?: string
          suggestion_type?: string
          updated_at?: string
          was_helpful?: boolean | null
          was_implemented?: boolean | null
        }
        Relationships: []
      }
      system_feedback: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          rating: number
          restaurant_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          message: string
          rating: number
          restaurant_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          rating?: number
          restaurant_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      check_restaurant_subscription: {
        Args: { restaurant_id_param: string }
        Returns: boolean
      }
      generate_tracking_code: { Args: never; Returns: string }
      get_my_subscription: {
        Args: never
        Returns: {
          billing_type: string
          created_at: string
          cycle: string
          id: string
          next_due_date: string
          status: string
          value: number
        }[]
      }
      get_order_by_tracking_code: {
        Args: { tracking_code_param: string }
        Returns: {
          created_at: string
          delivered_at: string
          id: string
          notes: string
          preparation_started_at: string
          ready_at: string
          status: string
          total_amount: number
          tracking_code: string
        }[]
      }
      get_order_items_by_order_id: {
        Args: { order_id_param: string }
        Returns: {
          product_name: string
          quantity: number
        }[]
      }
      get_public_products: {
        Args: { restaurant_id_param: string }
        Returns: {
          available: boolean
          category_id: string
          created_at: string
          description: string
          id: string
          image_url: string
          name: string
          price: number
          restaurant_id: string
          updated_at: string
        }[]
      }
      get_public_products_safe: {
        Args: { restaurant_id_param: string }
        Returns: {
          available: boolean
          category_id: string
          created_at: string
          description: string
          id: string
          image_url: string
          name: string
          price: number
          restaurant_id: string
          updated_at: string
        }[]
      }
      get_public_profile: {
        Args: { profile_id: string }
        Returns: {
          cover_url: string
          id: string
          logo_url: string
          opening_hours: Json
          restaurant_name: string
        }[]
      }
      get_public_profile_with_phone: {
        Args: { profile_id: string }
        Returns: {
          cover_url: string
          id: string
          logo_url: string
          max_delivery_time: number
          min_delivery_time: number
          opening_hours: Json
          phone: string
          restaurant_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_coupon_usage: {
        Args: { coupon_id_param: string }
        Returns: undefined
      }
      mark_abandoned_carts: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "restaurant"
      order_status:
        | "pending"
        | "preparing"
        | "ready"
        | "delivered"
        | "cancelled"
        | "on_the_way"
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
      app_role: ["admin", "restaurant"],
      order_status: [
        "pending",
        "preparing",
        "ready",
        "delivered",
        "cancelled",
        "on_the_way",
      ],
    },
  },
} as const
