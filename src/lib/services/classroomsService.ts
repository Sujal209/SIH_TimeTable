import { supabase } from '../supabase';
import { Classroom, ClassroomFormData } from '../../types';

export class ClassroomsService {
  static async getAll(): Promise<Classroom[]> {
    const { data, error } = await supabase
      .from('classrooms')
      .select('*')
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch classrooms: ${error.message}`);
    }

    return data || [];
  }

  static async getById(id: string): Promise<Classroom | null> {
    const { data, error } = await supabase
      .from('classrooms')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Classroom not found
      }
      throw new Error(`Failed to fetch classroom: ${error.message}`);
    }

    return data;
  }

  static async create(classroomData: ClassroomFormData): Promise<Classroom> {
    const { data, error } = await supabase
      .from('classrooms')
      .insert({
        name: classroomData.name,
        capacity: classroomData.capacity,
        type: classroomData.type,
        department: classroomData.department,
        equipment: classroomData.equipment,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create classroom: ${error.message}`);
    }

    return data;
  }

  static async update(id: string, classroomData: Partial<ClassroomFormData>): Promise<Classroom> {
    const { data, error } = await supabase
      .from('classrooms')
      .update({
        name: classroomData.name,
        capacity: classroomData.capacity,
        type: classroomData.type,
        department: classroomData.department,
        equipment: classroomData.equipment,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update classroom: ${error.message}`);
    }

    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('classrooms')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete classroom: ${error.message}`);
    }
  }

  static async getByType(type: 'lecture' | 'lab' | 'seminar'): Promise<Classroom[]> {
    const { data, error } = await supabase
      .from('classrooms')
      .select('*')
      .eq('type', type)
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch classrooms by type: ${error.message}`);
    }

    return data || [];
  }

  static async getByDepartment(department: string): Promise<Classroom[]> {
    const { data, error } = await supabase
      .from('classrooms')
      .select('*')
      .eq('department', department)
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch classrooms by department: ${error.message}`);
    }

    return data || [];
  }

  static async getAvailableClassrooms(
    department: string, 
    type: 'lecture' | 'lab' | 'seminar',
    minCapacity?: number
  ): Promise<Classroom[]> {
    let query = supabase
      .from('classrooms')
      .select('*')
      .eq('department', department)
      .eq('type', type);

    if (minCapacity) {
      query = query.gte('capacity', minCapacity);
    }

    const { data, error } = await query.order('capacity', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch available classrooms: ${error.message}`);
    }

    return data || [];
  }

  static async checkNameExists(name: string, excludeId?: string): Promise<boolean> {
    let query = supabase
      .from('classrooms')
      .select('id')
      .eq('name', name);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to check classroom name: ${error.message}`);
    }

    return data && data.length > 0;
  }

  static async getClassroomUtilization(): Promise<{ classroom_id: string; classroom_name: string; utilization_percentage: number }[]> {
    // This would require joining with timetable_entries to calculate utilization
    // For now, return empty array - this can be implemented later when timetables are created
    return [];
  }

  static async searchClassrooms(query: string): Promise<Classroom[]> {
    const { data, error } = await supabase
      .from('classrooms')
      .select('*')
      .or(`name.ilike.%${query}%, department.ilike.%${query}%`)
      .order('name');

    if (error) {
      throw new Error(`Failed to search classrooms: ${error.message}`);
    }

    return data || [];
  }
}