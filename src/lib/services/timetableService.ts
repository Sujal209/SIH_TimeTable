import { supabase } from '../supabase';
import { TimetableGenerationEngine } from './timetableGenerationEngine';
import { 
  TimetableEntry, 
  TimetableGenerationResult, 
  TimetableGenerationOptions,
  TimetableView,
  Batch,
  TimetableAssignment, 
  CreateTimetableAssignmentData, 
  UpdateTimetableAssignmentData 
} from '../../types';

export class TimetableService {
  /**
   * Generate a new timetable for a specific batch
   */
  static async generateTimetableForBatch(
    batchId: string,
    options: TimetableGenerationOptions
  ): Promise<TimetableGenerationResult> {
    try {
      console.log(`Starting timetable generation for batch: ${batchId}`);

      // Clear existing timetable if requested
      if (options.clearExisting) {
        await this.clearExistingTimetable(batchId, options.academicYear);
      }

      // Create generation engine with constraints
      const engine = new TimetableGenerationEngine({
        batchId,
        academicYear: options.academicYear,
        maxTeacherHoursPerDay: options.maxTeacherHoursPerDay || 6,
        includeLunchBreak: options.includeLunchBreak !== false,
        respectFacultyAvailability: options.respectFacultyAvailability !== false,
        includeSpecialClasses: options.includeSpecialClasses !== false
      });

      // Generate the timetable
      const result = await engine.generateTimetable();

      // Log generation result
      if (result.success) {
        console.log(`Timetable generated successfully for batch ${batchId}`);
        console.log(`Statistics:`, result.statistics);
        
        if (result.conflicts && result.conflicts.length > 0) {
          console.warn(`Generation completed with ${result.conflicts.length} conflicts`);
        }
      } else {
        console.error(`Timetable generation failed for batch ${batchId}:`, result.error);
      }

      return result;
    } catch (error) {
      console.error('Timetable generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        generatedAt: new Date().toISOString(),
        conflicts: []
      };
    }
  }

  /**
   * Generate timetables for multiple batches
   */
  static async generateTimetableForMultipleBatches(
    batchIds: string[],
    options: TimetableGenerationOptions
  ): Promise<Map<string, TimetableGenerationResult>> {
    const results = new Map<string, TimetableGenerationResult>();

    for (const batchId of batchIds) {
      console.log(`Generating timetable for batch ${batchId}...`);
      
      try {
        const result = await this.generateTimetableForBatch(batchId, {
          ...options,
          clearExisting: false // Don't clear when batch processing
        });
        results.set(batchId, result);
      } catch (error) {
        console.error(`Failed to generate timetable for batch ${batchId}:`, error);
        results.set(batchId, {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          generatedAt: new Date().toISOString(),
          conflicts: []
        });
      }
    }

    return results;
  }

  /**
   * Clear existing timetable for a batch
   */
  static async clearExistingTimetable(
    batchId: string,
    academicYear: string
  ): Promise<void> {
    try {
      console.log(`Clearing existing timetable for batch ${batchId}, year ${academicYear}`);

      const { error } = await supabase
        .from('timetable_entries')
        .delete()
        .eq('batch_id', batchId)
        .eq('academic_year', academicYear);

      if (error) {
        throw new Error(`Failed to clear timetable: ${error.message}`);
      }

      console.log('Existing timetable cleared successfully');
    } catch (error) {
      console.error('Error clearing timetable:', error);
      throw error;
    }
  }

  // Get all timetable assignments (legacy support)
  static async getAll(): Promise<TimetableAssignment[]> {
    const { data, error } = await supabase
      .from('timetable_assignments')
      .select('*')
      .order('day_of_week')
      .order('created_at');

    if (error) {
      throw new Error(`Failed to fetch timetable assignments: ${error.message}`);
    }

    return data || [];
  }

  // Get timetable assignments with full details (using the view)
  static async getAllWithDetails(): Promise<TimetableView[]> {
    const { data, error } = await supabase
      .from('timetable_view')
      .select('*')
      .order('day_of_week')
      .order('start_time');

    if (error) {
      throw new Error(`Failed to fetch timetable with details: ${error.message}`);
    }

    return data || [];
  }

  // Get assignments by day of week
  static async getByDay(dayOfWeek: number): Promise<TimetableView[]> {
    const { data, error } = await supabase
      .from('timetable_view')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .order('start_time');

    if (error) {
      throw new Error(`Failed to fetch timetable for day: ${error.message}`);
    }

    return data || [];
  }

  // Get assignments by teacher
  static async getByTeacher(teacherId: string): Promise<TimetableView[]> {
    const { data, error } = await supabase
      .from('timetable_view')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('day_of_week')
      .order('start_time');

    if (error) {
      throw new Error(`Failed to fetch teacher timetable: ${error.message}`);
    }

    return data || [];
  }

  // Get assignments by classroom
  static async getByClassroom(classroomId: string): Promise<TimetableView[]> {
    const { data, error } = await supabase
      .from('timetable_view')
      .select('*')
      .eq('classroom_id', classroomId)
      .order('day_of_week')
      .order('start_time');

    if (error) {
      throw new Error(`Failed to fetch classroom timetable: ${error.message}`);
    }

    return data || [];
  }

  // Get assignments by subject
  static async getBySubject(subjectId: string): Promise<TimetableView[]> {
    const { data, error } = await supabase
      .from('timetable_view')
      .select('*')
      .eq('subject_id', subjectId)
      .order('day_of_week')
      .order('start_time');

    if (error) {
      throw new Error(`Failed to fetch subject timetable: ${error.message}`);
    }

    return data || [];
  }

  // Create a new timetable assignment
  static async create(assignmentData: CreateTimetableAssignmentData): Promise<TimetableAssignment> {
    console.log('Creating timetable assignment with data:', assignmentData);
    
    try {
      const { data, error } = await supabase
        .from('timetable_assignments')
        .insert({
          ...assignmentData,
          week_number: assignmentData.week_number || 1,
        })
        .select('*')
        .single();

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        // Handle specific error codes
        if (error.code === '42501') {
          throw new Error('Permission denied. Please check your authentication and try again.');
        } else if (error.code === 'PGRST301') {
          throw new Error('Row level security policy violation. Please contact your administrator.');
        } else if (error.code === '23505') {
          throw new Error('This time slot is already occupied by another assignment.');
        } else {
          throw new Error(`Failed to create timetable assignment: ${error.message}`);
        }
      }

      console.log('Timetable assignment created successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in TimetableService.create:', error);
      throw error;
    }
  }

  // Update a timetable assignment
  static async update(id: string, assignmentData: UpdateTimetableAssignmentData): Promise<TimetableAssignment> {
    const { data, error } = await supabase
      .from('timetable_assignments')
      .update({
        ...assignmentData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update timetable assignment: ${error.message}`);
    }

    return data;
  }

  // Delete a timetable assignment
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('timetable_assignments')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete timetable assignment: ${error.message}`);
    }
  }

  // Check for conflicts before creating/updating assignments
  static async checkConflicts(
    teacherId: string,
    classroomId: string,
    timeSlotId: string,
    dayOfWeek: number,
    weekNumber: number = 1,
    excludeId?: string
  ): Promise<{
    teacherConflict: boolean;
    classroomConflict: boolean;
    conflictDetails: {
      teacher?: TimetableView;
      classroom?: TimetableView;
    };
  }> {
    // Check teacher conflict
    let teacherQuery = supabase
      .from('timetable_view')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('time_slot_id', timeSlotId)
      .eq('day_of_week', dayOfWeek)
      .eq('week_number', weekNumber);

    if (excludeId) {
      teacherQuery = teacherQuery.neq('id', excludeId);
    }

    const { data: teacherConflicts, error: teacherError } = await teacherQuery;

    if (teacherError) {
      throw new Error(`Failed to check teacher conflicts: ${teacherError.message}`);
    }

    // Check classroom conflict
    let classroomQuery = supabase
      .from('timetable_view')
      .select('*')
      .eq('classroom_id', classroomId)
      .eq('time_slot_id', timeSlotId)
      .eq('day_of_week', dayOfWeek)
      .eq('week_number', weekNumber);

    if (excludeId) {
      classroomQuery = classroomQuery.neq('id', excludeId);
    }

    const { data: classroomConflicts, error: classroomError } = await classroomQuery;

    if (classroomError) {
      throw new Error(`Failed to check classroom conflicts: ${classroomError.message}`);
    }

    return {
      teacherConflict: (teacherConflicts?.length || 0) > 0,
      classroomConflict: (classroomConflicts?.length || 0) > 0,
      conflictDetails: {
        teacher: teacherConflicts?.[0],
        classroom: classroomConflicts?.[0],
      },
    };
  }

  // Get weekly schedule in a structured format
  static async getWeeklySchedule(weekNumber: number = 1): Promise<Record<number, TimetableView[]>> {
    const { data, error } = await supabase
      .from('timetable_view')
      .select('*')
      .eq('week_number', weekNumber)
      .order('day_of_week')
      .order('start_time');

    if (error) {
      throw new Error(`Failed to fetch weekly schedule: ${error.message}`);
    }

    // Group by day of week
    const schedule: Record<number, TimetableView[]> = {
      0: [], // Sunday
      1: [], // Monday
      2: [], // Tuesday
      3: [], // Wednesday
      4: [], // Thursday
      5: [], // Friday
      6: [], // Saturday
    };

    data?.forEach(assignment => {
      schedule[assignment.day_of_week].push(assignment);
    });

    return schedule;
  }

  // Get assignment by specific slot
  static async getBySlot(
    timeSlotId: string, 
    dayOfWeek: number, 
    weekNumber: number = 1
  ): Promise<TimetableView | null> {
    const { data, error } = await supabase
      .from('timetable_view')
      .select('*')
      .eq('time_slot_id', timeSlotId)
      .eq('day_of_week', dayOfWeek)
      .eq('week_number', weekNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No assignment found
      }
      throw new Error(`Failed to fetch assignment by slot: ${error.message}`);
    }

    return data;
  }

  // Bulk create assignments
  static async bulkCreate(assignments: CreateTimetableAssignmentData[]): Promise<TimetableAssignment[]> {
    const assignmentsWithWeek = assignments.map(assignment => ({
      ...assignment,
      week_number: assignment.week_number || 1,
    }));

    const { data, error } = await supabase
      .from('timetable_assignments')
      .insert(assignmentsWithWeek)
      .select('*');

    if (error) {
      throw new Error(`Failed to bulk create assignments: ${error.message}`);
    }

    return data || [];
  }

  // Get statistics
  static async getStats(): Promise<{
    totalAssignments: number;
    assignmentsByDay: Record<number, number>;
    teacherUtilization: Record<string, number>;
    classroomUtilization: Record<string, number>;
  }> {
    const assignments = await this.getAllWithDetails();
    
    const stats = {
      totalAssignments: assignments.length,
      assignmentsByDay: {
        0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0
      },
      teacherUtilization: {} as Record<string, number>,
      classroomUtilization: {} as Record<string, number>,
    };

    assignments.forEach(assignment => {
      // Count by day
      stats.assignmentsByDay[assignment.day_of_week]++;
      
      // Count teacher utilization
      stats.teacherUtilization[assignment.teacher_id] = 
        (stats.teacherUtilization[assignment.teacher_id] || 0) + 1;
      
      // Count classroom utilization
      stats.classroomUtilization[assignment.classroom_id] = 
        (stats.classroomUtilization[assignment.classroom_id] || 0) + 1;
    });

    return stats;
  }
}