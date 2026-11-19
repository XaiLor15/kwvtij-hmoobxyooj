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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      elders: {
        Row: {
          active: boolean
          age: number | null
          bio: string | null
          branch: string | null
          created_at: string
          data: Json | null
          department: string | null
          display_order: number
          id: number
          member_id: number | null
          name: string | null
          note: string | null
          person_type: string
          phone: string | null
          photo: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          age?: number | null
          bio?: string | null
          branch?: string | null
          created_at?: string
          data?: Json | null
          department?: string | null
          display_order?: number
          id?: number
          member_id?: number | null
          name?: string | null
          note?: string | null
          person_type?: string
          phone?: string | null
          photo?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          age?: number | null
          bio?: string | null
          branch?: string | null
          created_at?: string
          data?: Json | null
          department?: string | null
          display_order?: number
          id?: number
          member_id?: number | null
          name?: string | null
          note?: string | null
          person_type?: string
          phone?: string | null
          photo?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elders_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elders_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_public"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          attendees: number | null
          budget: number | null
          category: string | null
          color_a: string | null
          color_b: string | null
          contributions: number | null
          cover: string | null
          created_at: string
          date: string | null
          description: string | null
          expected_per_member: number | null
          id: number
          location: string | null
          organizer: string | null
          spent: number | null
          status: string | null
          tags: Json | null
          time: string | null
          title: string | null
        }
        Insert: {
          attendees?: number | null
          budget?: number | null
          category?: string | null
          color_a?: string | null
          color_b?: string | null
          contributions?: number | null
          cover?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          expected_per_member?: number | null
          id?: number
          location?: string | null
          organizer?: string | null
          spent?: number | null
          status?: string | null
          tags?: Json | null
          time?: string | null
          title?: string | null
        }
        Update: {
          attendees?: number | null
          budget?: number | null
          category?: string | null
          color_a?: string | null
          color_b?: string | null
          contributions?: number | null
          cover?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          expected_per_member?: number | null
          id?: number
          location?: string | null
          organizer?: string | null
          spent?: number | null
          status?: string | null
          tags?: Json | null
          time?: string | null
          title?: string | null
        }
        Relationships: []
      }
      files: {
        Row: {
          category: string | null
          created_at: string
          date: string | null
          downloads: number | null
          id: number
          name: string | null
          size: string | null
          type: string | null
          uploader: string | null
          url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          date?: string | null
          downloads?: number | null
          id?: number
          name?: string | null
          size?: string | null
          type?: string | null
          uploader?: string | null
          url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          date?: string | null
          downloads?: number | null
          id?: number
          name?: string | null
          size?: string | null
          type?: string | null
          uploader?: string | null
          url?: string | null
        }
        Relationships: []
      }
      fund_members: {
        Row: {
          created_at: number
          id: string
          joined_at: string | null
          member_id: number
          note: string | null
          status: string | null
          updated_at: number
        }
        Insert: {
          created_at?: number
          id: string
          joined_at?: string | null
          member_id: number
          note?: string | null
          status?: string | null
          updated_at?: number
        }
        Update: {
          created_at?: number
          id?: string
          joined_at?: string | null
          member_id?: number
          note?: string | null
          status?: string | null
          updated_at?: number
        }
        Relationships: [
          {
            foreignKeyName: "fund_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members_public"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery: {
        Row: {
          created_at: string
          event_id: number
          id: number
          name: string | null
          url: string
        }
        Insert: {
          created_at?: string
          event_id: number
          id?: number
          name?: string | null
          url: string
        }
        Update: {
          created_at?: string
          event_id?: number
          id?: number
          name?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      leadership: {
        Row: {
          active: boolean
          bio: string | null
          branch: string | null
          created_at: string
          data: Json | null
          department: string | null
          display_order: number
          id: number
          member_id: number | null
          name: string | null
          person_type: string
          phone: string | null
          photo: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          bio?: string | null
          branch?: string | null
          created_at?: string
          data?: Json | null
          department?: string | null
          display_order?: number
          id?: number
          member_id?: number | null
          name?: string | null
          person_type?: string
          phone?: string | null
          photo?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          bio?: string | null
          branch?: string | null
          created_at?: string
          data?: Json | null
          department?: string | null
          display_order?: number
          id?: number
          member_id?: number | null
          name?: string | null
          person_type?: string
          phone?: string | null
          photo?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leadership_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leadership_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_public"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          category: string | null
          created_at: string
          data: Json | null
          date: string | null
          id: number
          participants: number | null
          pinned: boolean | null
          summary: string | null
          tags: Json | null
          title: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          data?: Json | null
          date?: string | null
          id?: number
          participants?: number | null
          pinned?: boolean | null
          summary?: string | null
          tags?: Json | null
          title?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          data?: Json | null
          date?: string | null
          id?: number
          participants?: number | null
          pinned?: boolean | null
          summary?: string | null
          tags?: Json | null
          title?: string | null
        }
        Relationships: []
      }
      member_relations: {
        Row: {
          id: number
          member_id: number
          related_id: number
          relation_type: string
        }
        Insert: {
          id?: number
          member_id: number
          related_id: number
          relation_type: string
        }
        Update: {
          id?: number
          member_id?: number
          related_id?: number
          relation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_relations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_relations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_relations_related_id_fkey"
            columns: ["related_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_relations_related_id_fkey"
            columns: ["related_id"]
            isOneToOne: false
            referencedRelation: "members_public"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          address: string | null
          age: number | null
          birthdate: string | null
          branch: string | null
          category: string | null
          created_at: string
          district: string | null
          gen: number | null
          gender: string | null
          id: number
          name: string
          nickname: string | null
          note: string | null
          parent_id: number | null
          phone: string | null
          photo: string | null
          position: string | null
          province: string | null
          role: string | null
          status: string | null
          village: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          birthdate?: string | null
          branch?: string | null
          category?: string | null
          created_at?: string
          district?: string | null
          gen?: number | null
          gender?: string | null
          id?: number
          name?: string
          nickname?: string | null
          note?: string | null
          parent_id?: number | null
          phone?: string | null
          photo?: string | null
          position?: string | null
          province?: string | null
          role?: string | null
          status?: string | null
          village?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          birthdate?: string | null
          branch?: string | null
          category?: string | null
          created_at?: string
          district?: string | null
          gen?: number | null
          gender?: string | null
          id?: number
          name?: string
          nickname?: string | null
          note?: string | null
          parent_id?: number | null
          phone?: string | null
          photo?: string | null
          position?: string | null
          province?: string | null
          role?: string | null
          status?: string | null
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "members_public"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          author: string | null
          category: string | null
          comments: number | null
          content: string | null
          created_at: string
          date: string | null
          featured: boolean | null
          id: number
          image: string | null
          pinned: boolean | null
          summary: string | null
          tags: Json | null
          title: string | null
          urgent: boolean | null
          views: number | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          comments?: number | null
          content?: string | null
          created_at?: string
          date?: string | null
          featured?: boolean | null
          id?: number
          image?: string | null
          pinned?: boolean | null
          summary?: string | null
          tags?: Json | null
          title?: string | null
          urgent?: boolean | null
          views?: number | null
        }
        Update: {
          author?: string | null
          category?: string | null
          comments?: number | null
          content?: string | null
          created_at?: string
          date?: string | null
          featured?: boolean | null
          id?: number
          image?: string | null
          pinned?: boolean | null
          summary?: string | null
          tags?: Json | null
          title?: string | null
          urgent?: boolean | null
          views?: number | null
        }
        Relationships: []
      }
      participants: {
        Row: {
          created_at: string
          event_id: number
          id: number
          member_id: number
        }
        Insert: {
          created_at?: string
          event_id: number
          id?: number
          member_id: number
        }
        Update: {
          created_at?: string
          event_id?: number
          id?: number
          member_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          author: string | null
          category: string | null
          content: string | null
          created_at: string
          date: string | null
          excerpt: string | null
          id: number
          images: Json | null
          member: string | null
          pinned: boolean | null
          reads: number | null
          tags: Json | null
          title: string | null
          videos: Json | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          date?: string | null
          excerpt?: string | null
          id?: number
          images?: Json | null
          member?: string | null
          pinned?: boolean | null
          reads?: number | null
          tags?: Json | null
          title?: string | null
          videos?: Json | null
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          date?: string | null
          excerpt?: string | null
          id?: number
          images?: Json | null
          member?: string | null
          pinned?: boolean | null
          reads?: number | null
          tags?: Json | null
          title?: string | null
          videos?: Json | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          contributor: string | null
          created_at: number
          date: string | null
          description: string | null
          direction: string
          event_id: number | null
          event_title: string | null
          id: string
          member_id: number | null
          method: string | null
          note: string | null
          type: string | null
        }
        Insert: {
          amount?: number
          category?: string | null
          contributor?: string | null
          created_at?: number
          date?: string | null
          description?: string | null
          direction: string
          event_id?: number | null
          event_title?: string | null
          id: string
          member_id?: number | null
          method?: string | null
          note?: string | null
          type?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          contributor?: string | null
          created_at?: number
          date?: string | null
          description?: string | null
          direction?: string
          event_id?: number | null
          event_title?: string | null
          id?: string
          member_id?: number | null
          method?: string | null
          note?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_public"
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
      elders_public: {
        Row: {
          active: boolean | null
          age: number | null
          bio: string | null
          branch: string | null
          created_at: string | null
          data: Json | null
          department: string | null
          display_order: number | null
          id: number | null
          member_id: number | null
          name: string | null
          note: string | null
          person_type: string | null
          photo: string | null
          position: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          age?: number | null
          bio?: string | null
          branch?: string | null
          created_at?: string | null
          data?: Json | null
          department?: string | null
          display_order?: number | null
          id?: number | null
          member_id?: number | null
          name?: string | null
          note?: string | null
          person_type?: string | null
          photo?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          age?: number | null
          bio?: string | null
          branch?: string | null
          created_at?: string | null
          data?: Json | null
          department?: string | null
          display_order?: number | null
          id?: number | null
          member_id?: number | null
          name?: string | null
          note?: string | null
          person_type?: string | null
          photo?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elders_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elders_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_public"
            referencedColumns: ["id"]
          },
        ]
      }
      leadership_public: {
        Row: {
          active: boolean | null
          bio: string | null
          branch: string | null
          created_at: string | null
          data: Json | null
          department: string | null
          display_order: number | null
          id: number | null
          member_id: number | null
          name: string | null
          person_type: string | null
          photo: string | null
          position: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          bio?: string | null
          branch?: string | null
          created_at?: string | null
          data?: Json | null
          department?: string | null
          display_order?: number | null
          id?: number | null
          member_id?: number | null
          name?: string | null
          person_type?: string | null
          photo?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          bio?: string | null
          branch?: string | null
          created_at?: string | null
          data?: Json | null
          department?: string | null
          display_order?: number | null
          id?: number | null
          member_id?: number | null
          name?: string | null
          person_type?: string | null
          photo?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leadership_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leadership_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_public"
            referencedColumns: ["id"]
          },
        ]
      }
      members_public: {
        Row: {
          age: number | null
          branch: string | null
          category: string | null
          created_at: string | null
          district: string | null
          gen: number | null
          gender: string | null
          id: number | null
          name: string | null
          nickname: string | null
          parent_id: number | null
          photo: string | null
          position: string | null
          province: string | null
          role: string | null
          status: string | null
          village: string | null
        }
        Insert: {
          age?: number | null
          branch?: string | null
          category?: string | null
          created_at?: string | null
          district?: string | null
          gen?: number | null
          gender?: string | null
          id?: number | null
          name?: string | null
          nickname?: string | null
          parent_id?: number | null
          photo?: string | null
          position?: string | null
          province?: string | null
          role?: string | null
          status?: string | null
          village?: string | null
        }
        Update: {
          age?: number | null
          branch?: string | null
          category?: string | null
          created_at?: string | null
          district?: string | null
          gen?: number | null
          gender?: string | null
          id?: number | null
          name?: string | null
          nickname?: string | null
          parent_id?: number | null
          photo?: string | null
          position?: string | null
          province?: string | null
          role?: string | null
          status?: string | null
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "members_public"
            referencedColumns: ["id"]
          },
        ]
      }
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
      app_role: "guest" | "member" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["guest", "member", "admin"],
    },
  },
} as const
