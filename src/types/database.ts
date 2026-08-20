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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}