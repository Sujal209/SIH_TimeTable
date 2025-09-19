import { supabase } from '../supabase';
import { 
  Batch, 
  BatchSubject, 
  BatchFormData,
  ProgramType,
  ShiftType
} from '../../types';

export class BatchesService {
  // Get all batches with optional filtering
  static async getAll(filters?: {
    department?: string;
    academic_year?: string;
    program_type?: ProgramType;
    is_active?: boolean;
  }): Promise<Batch[]> {
    let query = supabase
      .from('batches')
      .select('*')
      .order('department')
      .order('year')
      .order('semester');

    // Apply filters if provided
    if (filters?.department) {
      query = query.eq('department', filters.department);
    }
    if (filters?.academic_year) {
      query = query.eq('academic_year', filters.academic_year);
    }
    if (filters?.program_type) {
      query = query.eq('program_type', filters.program_type);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch batches: ${error.message}`);
    }

    return data || [];
  }

  // Get batch by ID
  static async getById(id: string): Promise<Batch | null> {
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch batch: ${error.message}`);
    }

    return data;
  }

  // Get batch with its subject mappings
  static async getWithSubjects(id: string): Promise<Batch & { subjects?: BatchSubject[] } | null> {
    const { data, error } = await supabase
      .from('batches')
      .select(`
        *,
        batch_subjects (
          id,
          subject_id,
          is_elective,
          is_mandatory,
          priority,
          created_at,
          subjects (
            id,
            name,
            code,
            department,
            semester,
            hours_per_week,
            lab_hours_per_week,
            credits,
            subject_type
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch batch with subjects: ${error.message}`);
    }

    // Transform the data to match our interface
    const batch = {
      ...data,
      subjects: data.batch_subjects?.map((bs: any) => ({
        id: bs.id,
        batch_id: data.id,
        subject_id: bs.subject_id,
        is_elective: bs.is_elective,
        is_mandatory: bs.is_mandatory,
        priority: bs.priority,
        created_at: bs.created_at,
        subject: bs.subjects
      })) || []
    };

    // Remove the raw batch_subjects property
    delete (batch as any).batch_subjects;

    return batch;
  }

  // Create new batch
  static async create(batchData: BatchFormData): Promise<Batch> {
    // First create the batch
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .insert({
        name: batchData.name,
        department: batchData.department,
        program_type: batchData.program_type,
        year: batchData.year,
        semester: batchData.semester,
        strength: batchData.strength,
        shift_type: batchData.shift_type,
        academic_year: batchData.academic_year,
        notes: batchData.notes
      })
      .select('*')
      .single();

    if (batchError) {
      throw new Error(`Failed to create batch: ${batchError.message}`);
    }

    // Create batch-subject mappings if subjects are provided
    if (batchData.subject_ids && batchData.subject_ids.length > 0) {
      const mappings = batchData.subject_ids.map((subjectId, index) => ({
        batch_id: batch.id,
        subject_id: subjectId,
        is_mandatory: true, // Default to mandatory
        priority: index + 1
      }));

      const { error: mappingError } = await supabase
        .from('batch_subjects')
        .insert(mappings);

      if (mappingError) {
        // If mappings fail, we should consider rolling back the batch creation
        // For now, we'll just log the error
        console.error('Failed to create batch-subject mappings:', mappingError);
      }
    }

    return batch;
  }

  // Update batch
  static async update(id: string, batchData: Partial<BatchFormData>): Promise<Batch> {
    const updateData: any = {
      ...batchData,
      updated_at: new Date().toISOString(),
    };

    // Remove subject_ids from update data as it's handled separately
    const { subject_ids, ...batchUpdateData } = updateData;

    const { data, error } = await supabase
      .from('batches')
      .update(batchUpdateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update batch: ${error.message}`);
    }

    // Update subject mappings if provided
    if (subject_ids) {
      await this.updateSubjectMappings(id, subject_ids);
    }

    return data;
  }

  // Delete batch
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('batches')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete batch: ${error.message}`);
    }
  }

  // Update batch-subject mappings
  static async updateSubjectMappings(batchId: string, subjectIds: string[]): Promise<void> {
    // First, delete existing mappings
    const { error: deleteError } = await supabase
      .from('batch_subjects')
      .delete()
      .eq('batch_id', batchId);

    if (deleteError) {
      throw new Error(`Failed to delete existing subject mappings: ${deleteError.message}`);
    }

    // Then create new mappings
    if (subjectIds.length > 0) {
      const mappings = subjectIds.map((subjectId, index) => ({
        batch_id: batchId,
        subject_id: subjectId,
        is_mandatory: true,
        priority: index + 1
      }));

      const { error: insertError } = await supabase
        .from('batch_subjects')
        .insert(mappings);

      if (insertError) {
        throw new Error(`Failed to create new subject mappings: ${insertError.message}`);
      }
    }
  }

  // Get batch-subject mappings for a batch
  static async getSubjectMappings(batchId: string): Promise<BatchSubject[]> {
    const { data, error } = await supabase
      .from('batch_subjects')
      .select(`
        *,
        subjects (
          id,
          name,
          code,
          department,
          credits,
          subject_type,
          hours_per_week,
          lab_hours_per_week
        )
      `)
      .eq('batch_id', batchId)
      .order('priority');

    if (error) {
      throw new Error(`Failed to fetch subject mappings: ${error.message}`);
    }

    return data?.map((item: any) => ({
      id: item.id,
      batch_id: item.batch_id,
      subject_id: item.subject_id,
      is_elective: item.is_elective,
      is_mandatory: item.is_mandatory,
      priority: item.priority,
      created_at: item.created_at,
      subject: item.subjects
    })) || [];
  }

  // Add subject to batch
  static async addSubjectToBatch(
    batchId: string, 
    subjectId: string, 
    options?: {
      is_elective?: boolean;
      is_mandatory?: boolean;
      priority?: number;
    }
  ): Promise<BatchSubject> {
    const { data, error } = await supabase
      .from('batch_subjects')
      .insert({
        batch_id: batchId,
        subject_id: subjectId,
        is_elective: options?.is_elective ?? false,
        is_mandatory: options?.is_mandatory ?? true,
        priority: options?.priority ?? 1
      })
      .select(`
        *,
        subjects (
          id,
          name,
          code,
          department,
          credits,
          subject_type,
          hours_per_week,
          lab_hours_per_week
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to add subject to batch: ${error.message}`);
    }

    return {
      id: data.id,
      batch_id: data.batch_id,
      subject_id: data.subject_id,
      is_elective: data.is_elective,
      is_mandatory: data.is_mandatory,
      priority: data.priority,
      created_at: data.created_at,
      subject: data.subjects
    };
  }

  // Remove subject from batch
  static async removeSubjectFromBatch(batchId: string, subjectId: string): Promise<void> {
    const { error } = await supabase
      .from('batch_subjects')
      .delete()
      .eq('batch_id', batchId)
      .eq('subject_id', subjectId);

    if (error) {
      throw new Error(`Failed to remove subject from batch: ${error.message}`);
    }
  }

  // Get batches by department
  static async getByDepartment(department: string, academicYear?: string): Promise<Batch[]> {
    let query = supabase
      .from('batches')
      .select('*')
      .eq('department', department)
      .eq('is_active', true)
      .order('year')
      .order('semester');

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch department batches: ${error.message}`);
    }

    return data || [];
  }

  // Get available electives for a batch
  static async getAvailableElectives(
    batchId: string, 
    department?: string
  ): Promise<any[]> {
    // Get current batch info
    const batch = await this.getById(batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    // Get subjects not already assigned to this batch
    const { data: assignedSubjects } = await supabase
      .from('batch_subjects')
      .select('subject_id')
      .eq('batch_id', batchId);

    const assignedIds = assignedSubjects?.map(bs => bs.subject_id) || [];

    let query = supabase
      .from('subjects')
      .select('*')
      .eq('semester', batch.semester);

    // Exclude already assigned subjects
    if (assignedIds.length > 0) {
      query = query.not('id', 'in', `(${assignedIds.join(',')})`);
    }

    // Filter by department if specified
    if (department) {
      query = query.eq('department', department);
    }

    const { data, error } = await query.order('name');

    if (error) {
      throw new Error(`Failed to fetch available electives: ${error.message}`);
    }

    return data || [];
  }

  // Get batch statistics
  static async getStatistics(): Promise<{
    totalBatches: number;
    activeBatches: number;
    batchesByDepartment: Record<string, number>;
    batchesByProgram: Record<string, number>;
    batchesByShift: Record<string, number>;
    averageStrength: number;
  }> {
    const { data: allBatches, error } = await supabase
      .from('batches')
      .select('*');

    if (error) {
      throw new Error(`Failed to fetch batch statistics: ${error.message}`);
    }

    const activeBatches = allBatches?.filter(b => b.is_active) || [];
    
    const stats = {
      totalBatches: allBatches?.length || 0,
      activeBatches: activeBatches.length,
      batchesByDepartment: {} as Record<string, number>,
      batchesByProgram: {} as Record<string, number>,
      batchesByShift: {} as Record<string, number>,
      averageStrength: 0
    };

    // Calculate statistics
    activeBatches.forEach(batch => {
      // By department
      stats.batchesByDepartment[batch.department] = 
        (stats.batchesByDepartment[batch.department] || 0) + 1;
      
      // By program type
      stats.batchesByProgram[batch.program_type] = 
        (stats.batchesByProgram[batch.program_type] || 0) + 1;
      
      // By shift
      stats.batchesByShift[batch.shift_type] = 
        (stats.batchesByShift[batch.shift_type] || 0) + 1;
    });

    // Calculate average strength
    if (activeBatches.length > 0) {
      stats.averageStrength = Math.round(
        activeBatches.reduce((sum, batch) => sum + batch.strength, 0) / activeBatches.length
      );
    }

    return stats;
  }

  // Search batches by name or department
  static async search(query: string): Promise<Batch[]> {
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .or(`name.ilike.%${query}%,department.ilike.%${query}%`)
      .eq('is_active', true)
      .order('name')
      .limit(20);

    if (error) {
      throw new Error(`Failed to search batches: ${error.message}`);
    }

    return data || [];
  }

  // Validate batch data before creation/update
  static validateBatchData(data: BatchFormData): string[] {
    const errors: string[] = [];

    if (!data.name?.trim()) {
      errors.push('Batch name is required');
    }

    if (!data.department?.trim()) {
      errors.push('Department is required');
    }

    if (!data.academic_year?.trim()) {
      errors.push('Academic year is required');
    }

    if (data.year < 1 || data.year > 6) {
      errors.push('Year must be between 1 and 6');
    }

    if (data.semester < 1 || data.semester > 12) {
      errors.push('Semester must be between 1 and 12');
    }

    if (data.strength < 0) {
      errors.push('Student strength cannot be negative');
    }

    if (data.strength > 200) {
      errors.push('Student strength seems unusually high (>200)');
    }

    return errors;
  }
}