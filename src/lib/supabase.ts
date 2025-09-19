import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database schema types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: 'admin' | 'teacher';
          department: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          role: 'admin' | 'teacher';
          department?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: 'admin' | 'teacher';
          department?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
      };
      teachers: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          email: string;
          department: string;
          phone: string | null;
          max_hours_per_day: number;
          unavailable_slots: string[];
          preferences: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          email: string;
          department: string;
          phone?: string | null;
          max_hours_per_day?: number;
          unavailable_slots?: string[];
          preferences?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          email?: string;
          department?: string;
          phone?: string | null;
          max_hours_per_day?: number;
          unavailable_slots?: string[];
          preferences?: any;
          updated_at?: string;
        };
      };
      subjects: {
        Row: {
          id: string;
          name: string;
          code: string;
          department: string;
          semester: number;
          hours_per_week: number;
          lab_hours_per_week: number;
          teacher_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          department: string;
          semester: number;
          hours_per_week: number;
          lab_hours_per_week: number;
          teacher_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          department?: string;
          semester?: number;
          hours_per_week?: number;
          lab_hours_per_week?: number;
          teacher_id?: string;
          updated_at?: string;
        };
      };
      classrooms: {
        Row: {
          id: string;
          name: string;
          capacity: number;
          type: 'lecture' | 'lab' | 'seminar';
          department: string;
          equipment: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          capacity: number;
          type: 'lecture' | 'lab' | 'seminar';
          department: string;
          equipment?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          capacity?: number;
          type?: 'lecture' | 'lab' | 'seminar';
          department?: string;
          equipment?: string[];
          updated_at?: string;
        };
      };
      time_slots: {
        Row: {
          id: string;
          day: string;
          start_time: string;
          end_time: string;
          duration: number;
          is_break: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          day: string;
          start_time: string;
          end_time: string;
          duration: number;
          is_break?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          day?: string;
          start_time?: string;
          end_time?: string;
          duration?: number;
          is_break?: boolean;
          updated_at?: string;
        };
      };
      timetables: {
        Row: {
          id: string;
          name: string;
          department: string;
          semester: number;
          academic_year: string;
          is_active: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          department: string;
          semester: number;
          academic_year: string;
          is_active?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          department?: string;
          semester?: number;
          academic_year?: string;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      timetable_entries: {
        Row: {
          id: string;
          timetable_id: string;
          subject_id: string;
          teacher_id: string;
          classroom_id: string;
          time_slot_id: string;
          day: string;
          is_lab: boolean;
          consecutive_slots: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          timetable_id: string;
          subject_id: string;
          teacher_id: string;
          classroom_id: string;
          time_slot_id: string;
          day: string;
          is_lab?: boolean;
          consecutive_slots?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          timetable_id?: string;
          subject_id?: string;
          teacher_id?: string;
          classroom_id?: string;
          time_slot_id?: string;
          day?: string;
          is_lab?: boolean;
          consecutive_slots?: number | null;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: 'admin' | 'teacher';
      classroom_type: 'lecture' | 'lab' | 'seminar';
      day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
    };
  };
}