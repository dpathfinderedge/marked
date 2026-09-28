export interface Database {
  public: {
    Tables: {
      trades: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          pair: string;
          market: "forex" | "crypto";
          direction: "long" | "short";
          session: "Asian" | "London" | "New York" | "Overlap";
          tag: string;
          risk: number | null;
          pnl: number;
          pips: number | null;
          r_multiple: number | null;
          notes: string;
          calc_mode: "direct" | "converted" | "manual";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          pair: string;
          market: "forex" | "crypto";
          direction: "long" | "short";
          session: "Asian" | "London" | "New York" | "Overlap";
          tag?: string;
          risk?: number | null;
          pnl: number;
          pips?: number | null;
          r_multiple?: number | null;
          notes?: string;
          calc_mode: "direct" | "converted" | "manual";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          pair?: string;
          market?: "forex" | "crypto";
          direction?: "long" | "short";
          session?: "Asian" | "London" | "New York" | "Overlap";
          tag?: string;
          risk?: number | null;
          pnl?: number;
          pips?: number | null;
          r_multiple?: number | null;
          notes?: string;
          calc_mode?: "direct" | "converted" | "manual";
          created_at?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          consecutive_loss_threshold: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          consecutive_loss_threshold?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          consecutive_loss_threshold?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      trade_attachments: {
        Row: {
          id: string;
          trade_id: string;
          user_id: string;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          trade_id: string;
          user_id: string;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          trade_id?: string;
          user_id?: string;
          storage_path?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    subscriptions: {
      Row: {
        user_id: string;
        status: "free" | "active" | "past_due" | "cancelled";
        paystack_customer_code: string | null;
        paystack_subscription_code: string | null;
        plan_code: string | null;
        current_period_end: string | null;
        updated_at: string;
      };
      Insert: never;
      Update: never;
      Relationships: [];
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}