import { supabase } from '../supabase';
import { Subject, SubjectFormData } from '../../types';

export class SubjectsService {
  static async getAll(): Promise<Subject[]> {
    const { data, error } = await supabase
      .from('subjects')
      .select(`
        *,
        teacher:teachers(
          id,
          name,
          email,
          department
        )
      `)
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch subjects: ${error.message}`);
    }

    return data || [];
  }

  static async getById(id: string): Promise<Subject | null> {
    const { data, error } = await supabase
      .from('subjects')
      .select(`
        *,
        teacher:teachers(
          id,
          name,
          email,
          department
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Subject not found
      }
      throw new Error(`Failed to fetch subject: ${error.message}`);
    }

    return data;
  }

  static async create(subjectData: SubjectFormData): Promise<Subject> {
    const { data, error } = await supabase
      .from('subjects')
      .insert({
        name: subjectData.name,
        code: subjectData.code,
        department: subjectData.department,
        semester: subjectData.semester,
        hours_per_week: subjectData.hours_per_week,
        lab_hours_per_week: subjectData.lab_hours_per_week,
        teacher_id: subjectData.teacher_id,
      })
      .select(`
        *,
        teacher:teachers(
          id,
          name,
          email,
          department
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create subject: ${error.message}`);
    }

    return data;
  }

  static async update(id: string, subjectData: Partial<SubjectFormData>): Promise<Subject> {
    const { data, error } = await supabase
      .from('subjects')
      .update({
        name: subjectData.name,
        code: subjectData.code,
        department: subjectData.department,
        semester: subjectData.semester,
        hours_per_week: subjectData.hours_per_week,
        lab_hours_per_week: subjectData.lab_hours_per_week,
        teacher_id: subjectData.teacher_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        teacher:teachers(
          id,
          name,
          email,
          department
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update subject: ${error.message}`);
    }

    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete subject: ${error.message}`);
    }
  }

  static async getByDepartment(department: string): Promise<Subject[]> {
    const { data, error } = await supabase
      .from('subjects')
      .select(`
        *,
        teacher:teachers(
          id,
          name,
          email,
          department
        )
      `)
      .eq('department', department)
      .order('semester', { ascending: true })
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch subjects by department: ${error.message}`);
    }

    return data || [];
  }

  static async getBySemester(semester: number): Promise<Subject[]> {
    const { data, error } = await supabase
      .from('subjects')
      .select(`
        *,
        teacher:teachers(
          id,
          name,
          email,
          department
        )
      `)
      .eq('semester', semester)
      .order('department')
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch subjects by semester: ${error.message}`);
    }

    return data || [];
  }

  static async getByTeacher(teacherId: string): Promise<Subject[]> {
    const { data, error } = await supabase
      .from('subjects')
      .select(`
        *,
        teacher:teachers(
          id,
          name,
          email,
          department
        )
      `)
      .eq('teacher_id', teacherId)
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch subjects by teacher: ${error.message}`);
    }

    return data || [];
  }

  static async getByDepartmentAndSemester(department: string, semester: number): Promise<Subject[]> {
    const { data, error } = await supabase
      .from('subjects')
      .select(`
        *,
        teacher:teachers(
          id,
          name,
          email,
          department
        )
      `)
      .eq('department', department)
      .eq('semester', semester)
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch subjects by department and semester: ${error.message}`);
    }

    return data || [];
  }

  static async checkCodeExists(code: string, excludeId?: string): Promise<boolean> {
    let query = supabase
      .from('subjects')
      .select('id')
      .eq('code', code);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to check subject code: ${error.message}`);
    }

    return data && data.length > 0;
  }

  static async getTotalHoursByTeacher(teacherId: string): Promise<number> {
    const { data, error } = await supabase
      .from('subjects')
      .select('hours_per_week, lab_hours_per_week')
      .eq('teacher_id', teacherId);

    if (error) {
      throw new Error(`Failed to calculate teacher hours: ${error.message}`);
    }

    if (!data) return 0;

    return data.reduce((total, subject) => {
      return total + (subject.hours_per_week || 0) + (subject.lab_hours_per_week || 0);
    }, 0);
  }
}