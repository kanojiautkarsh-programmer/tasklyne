export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          company_name: string | null;
          stripe_customer_id: string | null;
          subscription_tier: "free" | "starter" | "pro" | "scale";
          subscription_status: "active" | "canceled" | "past_due";
          current_team_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          company_name?: string | null;
          stripe_customer_id?: string | null;
          subscription_tier?: "free" | "starter" | "pro" | "scale";
          subscription_status?: "active" | "cancelled" | "past_due";
          current_team_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          company_name?: string | null;
          stripe_customer_id?: string | null;
          subscription_tier?: "free" | "starter" | "pro" | "scale";
          subscription_status?: "active" | "cancelled" | "past_due";
          current_team_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      api_keys: {
        Row: {
          id: string;
          user_id: string;
          provider: "openai" | "anthropic" | "gemini";
          encrypted_key: string;
          is_valid: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: "openai" | "anthropic" | "gemini";
          encrypted_key: string;
          is_valid?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: "openai" | "anthropic" | "gemini";
          encrypted_key?: string;
          is_valid?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          agent_type: "research" | "build" | "growth";
          title: string;
          description: string | null;
          status: "pending" | "running" | "completed" | "failed";
          input_params: Json | null;
          output: Json | null;
          tokens_used: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          agent_type: "research" | "build" | "growth";
          title: string;
          description?: string | null;
          status?: "pending" | "running" | "completed" | "failed";
          input_params?: Json | null;
          output?: Json | null;
          tokens_used?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          agent_type?: "research" | "build" | "growth";
          title?: string;
          description?: string | null;
          status?: "pending" | "running" | "completed" | "failed";
          input_params?: Json | null;
          output?: Json | null;
          tokens_used?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      research_reports: {
        Row: {
          id: string;
          task_id: string;
          report_type: "market_analysis" | "competitor" | "sentiment";
          content: Json;
          sources: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          report_type: "market_analysis" | "competitor" | "sentiment";
          content: Json;
          sources: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          report_type?: "market_analysis" | "competitor" | "sentiment";
          content?: Json;
          sources?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      build_artifacts: {
        Row: {
          id: string;
          task_id: string;
          artifact_type: "prd" | "feature_spec" | "user_stories" | "tech_stack";
          content: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          artifact_type: "prd" | "feature_spec" | "user_stories" | "tech_stack";
          content: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          artifact_type?: "prd" | "feature_spec" | "user_stories" | "tech_stack";
          content?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      campaigns: {
        Row: {
          id: string;
          task_id: string;
          campaign_type: "cold_email" | "blog" | "onboarding";
          content: Json;
          recipients: Json | null;
          status: "draft" | "scheduled" | "sent";
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          campaign_type: "cold_email" | "blog" | "onboarding";
          content: Json;
          recipients?: Json | null;
          status?: "draft" | "scheduled" | "sent";
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          campaign_type?: "cold_email" | "blog" | "onboarding";
          content?: Json;
          recipients?: Json | null;
          status?: "draft" | "scheduled" | "sent";
          sent_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      integrations: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          credentials: Json;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          credentials: Json;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          credentials?: Json;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      usage_logs: {
        Row: {
          id: string;
          user_id: string;
          agent_type: string;
          action: string;
          tokens_used: number;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          agent_type: string;
          action: string;
          tokens_used?: number;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          agent_type?: string;
          action?: string;
          tokens_used?: number;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          role: "owner" | "admin" | "member" | "viewer";
          invited_by: string | null;
          joined_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          user_id: string;
          role?: "owner" | "admin" | "member" | "viewer";
          invited_by?: string | null;
          joined_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          user_id?: string;
          role?: "owner" | "admin" | "member" | "viewer";
          invited_by?: string | null;
          joined_at?: string;
        };
        Relationships: [];
      };
      team_invitations: {
        Row: {
          id: string;
          team_id: string;
          email: string;
          role: "admin" | "member" | "viewer";
          invited_by: string | null;
          token: string;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          email: string;
          role?: "admin" | "member" | "viewer";
          invited_by?: string | null;
          token: string;
          expires_at: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          email?: string;
          role?: "admin" | "member" | "viewer";
          invited_by?: string | null;
          token?: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      shared_tasks: {
        Row: {
          id: string;
          task_id: string;
          share_token: string;
          is_public: boolean;
          allow_comments: boolean;
          expires_at: string | null;
          view_count: number;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          share_token: string;
          is_public?: boolean;
          allow_comments?: boolean;
          expires_at?: string | null;
          view_count?: number;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          share_token?: string;
          is_public?: boolean;
          allow_comments?: boolean;
          expires_at?: string | null;
          view_count?: number;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      shared_reports: {
        Row: {
          id: string;
          report_id: string;
          share_token: string;
          is_public: boolean;
          expires_at: string | null;
          view_count: number;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          share_token: string;
          is_public?: boolean;
          expires_at?: string | null;
          view_count?: number;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          share_token?: string;
          is_public?: boolean;
          expires_at?: string | null;
          view_count?: number;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string | null;
          link: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message?: string | null;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string | null;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
