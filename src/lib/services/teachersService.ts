import { supabase } from '../supabase';
import { Teacher, TeacherFormData } from '../../types';

export class TeachersService {
  static async getAll(): Promise<Teacher[]> {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch teachers: ${error.message}`);
    }

    return data || [];
  }

  static async getById(id: string): Promise<Teacher | null> {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Teacher not found
      }
      throw new Error(`Failed to fetch teacher: ${error.message}`);
    }

    return data;
  }

  static async getByUserId(userId: string): Promise<Teacher | null> {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Teacher not found
      }
      throw new Error(`Failed to fetch teacher: ${error.message}`);
    }

    return data;
  }

  static async create(teacherData: TeacherFormData): Promise<Teacher> {
    // For now, just create teacher without user record to avoid RLS issues
    // In production, you'd want to create proper user accounts
    const { data, error } = await supabase
      .from('teachers')
      .insert({
        user_id: null, // We'll make this nullable for admin-created teachers
        name: teacherData.name,
        email: teacherData.email,
        department: teacherData.department,
        phone: teacherData.phone,
        max_hours_per_day: teacherData.max_hours_per_day,
        unavailable_slots: [],
        preferences: {
          preferred_time_slots: [],
          max_consecutive_hours: 3,
          preferred_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          break_duration: 15,
        },
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create teacher: ${error.message}`);
    }

    return data;
  }

  static async update(id: string, teacherData: Partial<TeacherFormData>): Promise<Teacher> {
    const { data, error } = await supabase
      .from('teachers')
      .update({
        name: teacherData.name,
        email: teacherData.email,
        department: teacherData.department,
        phone: teacherData.phone,
        max_hours_per_day: teacherData.max_hours_per_day,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update teacher: ${error.message}`);
    }

    return data;
  }

  static async delete(id: string): Promise<void> {
    // Get teacher to find user_id
    const teacher = await this.getById(id);
    if (!teacher) {
      throw new Error('Teacher not found');
    }

    // Delete teacher (user will be cascade deleted)
    const { error } = await supabase
      .from('teachers')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete teacher: ${error.message}`);
    }
  }

  static async updatePreferences(id: string, preferences: any): Promise<Teacher> {
    const { data, error } = await supabase
      .from('teachers')
      .update({
        preferences,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update teacher preferences: ${error.message}`);
    }

    return data;
  }

  static async updateUnavailableSlots(id: string, slots: string[]): Promise<Teacher> {
    const { data, error } = await supabase
      .from('teachers')
      .update({
        unavailable_slots: slots,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update unavailable slots: ${error.message}`);
    }

    return data;
  }

  static async getByDepartment(department: string): Promise<Teacher[]> {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('department', department)
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch teachers by department: ${error.message}`);
    }

    return data || [];
  }
}