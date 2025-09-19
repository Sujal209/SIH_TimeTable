import { supabase } from '../supabase';
import { 
  SpecialClass, 
  SpecialClassFormData, 
  ClassType, 
  SpecialClassType,
  SpecialClassStatus,
  RecurrencePattern,
  ShiftType 
} from '../../types';

export class SpecialClassesService {
  // ============================================================================
  // SPECIAL CLASSES CRUD OPERATIONS
  // ============================================================================

  static async getAll(filters?: {
    academic_year?: string;
    class_type?: SpecialClassType;
    status?: SpecialClassStatus;
    batch_id?: string;
    teacher_id?: string;
    classroom_id?: string;
    shift_type?: string;
    is_recurring?: boolean;
  }): Promise<SpecialClass[]> {
    let query = supabase
      .from('special_classes')
      .select(`
        *,
        subject:subjects(*),
        teacher:teachers(*),
        classroom:classrooms(*),
        batch:batches(*),
        creator:users(*)
      `)
      .order('start_date', { ascending: false })
      .order('day_of_week')
      .order('start_time');

    // Apply filters if provided
    if (filters?.academic_year) {
      query = query.eq('academic_year', filters.academic_year);
    }
    if (filters?.class_type) {
      query = query.eq('class_type', filters.class_type);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.batch_id) {
      query = query.eq('batch_id', filters.batch_id);
    }
    if (filters?.teacher_id) {
      query = query.eq('teacher_id', filters.teacher_id);
    }
    if (filters?.classroom_id) {
      query = query.eq('classroom_id', filters.classroom_id);
    }
    if (filters?.shift_type) {
      query = query.eq('shift_type', filters.shift_type);
    }
    if (filters?.is_recurring !== undefined) {
      query = query.eq('is_recurring', filters.is_recurring);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch special classes: ${error.message}`);
    }

    return data || [];
  }

  static async getById(id: string): Promise<SpecialClass | null> {
    const { data, error } = await supabase
      .from('special_classes')
      .select(`
        *,
        subject:subjects(*),
        teacher:teachers(*),
        classroom:classrooms(*),
        batch:batches(*),
        creator:users(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch special class: ${error.message}`);
    }

    return data;
  }

  static async create(specialClassData: SpecialClassFormData): Promise<SpecialClass> {
    // Validate time slot
    if (specialClassData.start_time >= specialClassData.end_time) {
      throw new Error('Start time must be before end time');
    }

    // Convert date to day of week and start_date for database
    const date = new Date(specialClassData.date);
    const dayOfWeek = date.getDay();
    const startDate = specialClassData.date;

    // Check for conflicts with existing special classes
    const hasConflict = await this.checkTimeConflict(
      specialClassData.classroom_id,
      dayOfWeek,
      specialClassData.start_time,
      specialClassData.end_time,
      specialClassData.academic_year
    );

    if (hasConflict) {
      throw new Error('Time slot conflicts with existing special class');
    }

    // Validate recurring end date if provided
    if (specialClassData.is_recurring && specialClassData.recurring_end_date && new Date(specialClassData.date) > new Date(specialClassData.recurring_end_date)) {
      throw new Error('Date cannot be after recurring end date');
    }

    // Map form data to database schema
    const dbData = {
      name: specialClassData.title, // UI 'title' -> DB 'name'
      class_type: specialClassData.class_type,
      subject_id: specialClassData.subject_id,
      teacher_id: specialClassData.teacher_id,
      classroom_id: specialClassData.classroom_id,
      batch_id: specialClassData.batch_id,
      day_of_week: dayOfWeek, // Converted from date
      start_time: specialClassData.start_time,
      end_time: specialClassData.end_time,
      is_recurring: specialClassData.is_recurring,
      recurrence_pattern: specialClassData.recurring_pattern || 'once',
      start_date: startDate, // UI 'date' -> DB 'start_date'
      end_date: specialClassData.recurring_end_date,
      required_equipment: specialClassData.required_equipment,
      special_requirements: specialClassData.description, // UI 'description' -> DB 'special_requirements'
      max_students: specialClassData.max_students,
      is_mandatory: specialClassData.is_mandatory ?? true,
      priority: specialClassData.priority,
      shift_type: specialClassData.shift_type || 'morning',
      academic_year: specialClassData.academic_year,
      notes: specialClassData.notes,
      status: 'active' as SpecialClassStatus,
    };

    const { data, error } = await supabase
      .from('special_classes')
      .insert(dbData)
      .select(`
        *,
        subject:subjects(*),
        teacher:teachers(*),
        classroom:classrooms(*),
        batch:batches(*),
        creator:users(*)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create special class: ${error.message}`);
    }

    return data;
  }

  static async update(id: string, specialClassData: Partial<SpecialClassFormData>): Promise<SpecialClass> {
    // If updating time-related fields, validate them
    if (specialClassData.start_time || specialClassData.end_time || specialClassData.date) {
      const existingClass = await this.getById(id);
      if (existingClass) {
        const startTime = specialClassData.start_time || existingClass.start_time;
        const endTime = specialClassData.end_time || existingClass.end_time;
        
        if (startTime >= endTime) {
          throw new Error('Start time must be before end time');
        }

        // Get day of week from date
        const date = specialClassData.date ? new Date(specialClassData.date) : new Date(existingClass.start_date);
        const dayOfWeek = date.getDay();

        // Check for conflicts (excluding current class)
        const hasConflict = await this.checkTimeConflict(
          specialClassData.classroom_id || existingClass.classroom_id,
          dayOfWeek,
          startTime,
          endTime,
          specialClassData.academic_year || existingClass.academic_year,
          id // Exclude current class
        );

        if (hasConflict) {
          throw new Error('Time slot conflicts with existing special class');
        }
      }
    }

    // Map form data to database schema
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (specialClassData.title) updateData.name = specialClassData.title;
    if (specialClassData.description) updateData.special_requirements = specialClassData.description;
    if (specialClassData.class_type) updateData.class_type = specialClassData.class_type;
    if (specialClassData.subject_id !== undefined) updateData.subject_id = specialClassData.subject_id;
    if (specialClassData.teacher_id !== undefined) updateData.teacher_id = specialClassData.teacher_id;
    if (specialClassData.classroom_id) updateData.classroom_id = specialClassData.classroom_id;
    if (specialClassData.batch_id !== undefined) updateData.batch_id = specialClassData.batch_id;
    if (specialClassData.date) {
      const date = new Date(specialClassData.date);
      updateData.day_of_week = date.getDay();
      updateData.start_date = specialClassData.date;
    }
    if (specialClassData.start_time) updateData.start_time = specialClassData.start_time;
    if (specialClassData.end_time) updateData.end_time = specialClassData.end_time;
    if (specialClassData.is_recurring !== undefined) updateData.is_recurring = specialClassData.is_recurring;
    if (specialClassData.recurring_pattern) updateData.recurrence_pattern = specialClassData.recurring_pattern;
    if (specialClassData.recurring_end_date) updateData.end_date = specialClassData.recurring_end_date;
    if (specialClassData.required_equipment) updateData.required_equipment = specialClassData.required_equipment;
    if (specialClassData.special_requirements) updateData.special_requirements = specialClassData.special_requirements;
    if (specialClassData.max_students !== undefined) updateData.max_students = specialClassData.max_students;
    if (specialClassData.is_mandatory !== undefined) updateData.is_mandatory = specialClassData.is_mandatory;
    if (specialClassData.priority !== undefined) updateData.priority = specialClassData.priority;
    if (specialClassData.shift_type) updateData.shift_type = specialClassData.shift_type;
    if (specialClassData.academic_year) updateData.academic_year = specialClassData.academic_year;
    if (specialClassData.notes) updateData.notes = specialClassData.notes;

    const { data, error } = await supabase
      .from('special_classes')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        teacher:teachers(*),
        classroom:classrooms(*),
        batch:batches(*)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update special class: ${error.message}`);
    }

    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('special_classes')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete special class: ${error.message}`);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  // ============================================================================
  // FILTERING AND SEARCH
  // ============================================================================

  static async getByClassType(classType: SpecialClassType, academicYear?: string): Promise<SpecialClass[]> {
    let query = supabase
      .from('special_classes')
      .select(`
        *,
        subject:subjects(*),
        teacher:teachers(*),
        classroom:classrooms(*),
        batch:batches(*),
        creator:users(*)
      `)
      .eq('class_type', classType)
      .order('start_date')
      .order('start_time');

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch special classes by type: ${error.message}`);
    }

    return data || [];
  }

  static async getByTeacher(teacherId: string, academicYear?: string): Promise<SpecialClass[]> {
    let query = supabase
      .from('special_classes')
      .select(`
        *,
        subject:subjects(*),
        teacher:teachers(*),
        classroom:classrooms(*),
        batch:batches(*),
        creator:users(*)
      `)
      .eq('teacher_id', teacherId)
      .order('start_date')
      .order('start_time');

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch teacher's special classes: ${error.message}`);
    }

    return data || [];
  }

  static async getByBatch(batchId: string, academicYear?: string): Promise<SpecialClass[]> {
    let query = supabase
      .from('special_classes')
      .select(`
        *,
        subject:subjects(*),
        teacher:teachers(*),
        classroom:classrooms(*),
        batch:batches(*),
        creator:users(*)
      `)
      .eq('batch_id', batchId)
      .order('start_date')
      .order('start_time');

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch batch special classes: ${error.message}`);
    }

    return data || [];
  }

  static async getByClassroom(classroomId: string, academicYear?: string): Promise<SpecialClass[]> {
    let query = supabase
      .from('special_classes')
      .select(`
        *,
        subject:subjects(*),
        teacher:teachers(*),
        classroom:classrooms(*),
        batch:batches(*),
        creator:users(*)
      `)
      .eq('classroom_id', classroomId)
      .order('start_date')
      .order('start_time');

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch classroom special classes: ${error.message}`);
    }

    return data || [];
  }

  static async getUpcoming(limit: number = 10): Promise<SpecialClass[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('special_classes')
      .select(`
        *,
        subject:subjects(*),
        teacher:teachers(*),
        classroom:classrooms(*),
        batch:batches(*),
        creator:users(*)
      `)
      .eq('status', 'active')
      .gte('start_date', today)
      .order('start_date')
      .order('start_time')
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch upcoming special classes: ${error.message}`);
    }

    return data || [];
  }

  static async searchClasses(searchTerm: string, academicYear?: string): Promise<SpecialClass[]> {
    let query = supabase
      .from('special_classes')
      .select(`
        *,
        subject:subjects(*),
        teacher:teachers(*),
        classroom:classrooms(*),
        batch:batches(*),
        creator:users(*)
      `)
      .or(`name.ilike.%${searchTerm}%,class_type.ilike.%${searchTerm}%,special_requirements.ilike.%${searchTerm}%`)
      .eq('status', 'active')
      .order('start_date')
      .order('start_time');

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to search special classes: ${error.message}`);
    }

    return data || [];
  }

  // ============================================================================
  // CONFLICT DETECTION
  // ============================================================================

  static async checkTimeConflict(
    classroomId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    academicYear: string,
    excludeId?: string
  ): Promise<boolean> {
    let query = supabase
      .from('special_classes')
      .select('id')
      .eq('classroom_id', classroomId)
      .eq('day_of_week', dayOfWeek)
      .eq('academic_year', academicYear)
      .eq('status', 'active')
      .or(`and(start_time.lte.${startTime},end_time.gt.${startTime}),and(start_time.lt.${endTime},end_time.gte.${endTime}),and(start_time.gte.${startTime},end_time.lte.${endTime})`);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to check time conflict: ${error.message}`);
    }

    return data && data.length > 0;
  }

  static async checkTeacherConflict(
    teacherId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    academicYear: string,
    excludeId?: string
  ): Promise<boolean> {
    if (!teacherId) return false;

    let query = supabase
      .from('special_classes')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('day_of_week', dayOfWeek)
      .eq('academic_year', academicYear)
      .eq('status', 'active')
      .or(`and(start_time.lte.${startTime},end_time.gt.${startTime}),and(start_time.lt.${endTime},end_time.gte.${endTime}),and(start_time.gte.${startTime},end_time.lte.${endTime})`);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to check teacher conflict: ${error.message}`);
    }

    return data && data.length > 0;
  }

  // ============================================================================
  // RECURRING CLASSES MANAGEMENT
  // ============================================================================

  static async getRecurringClasses(academicYear?: string): Promise<SpecialClass[]> {
    let query = supabase
      .from('special_classes')
      .select(`
        *,
        subject:subjects(*),
        teacher:teachers(*),
        classroom:classrooms(*),
        batch:batches(*),
        creator:users(*)
      `)
      .eq('is_recurring', true)
      .eq('status', 'active')
      .order('day_of_week')
      .order('start_time');

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch recurring classes: ${error.message}`);
    }

    return data || [];
  }

  static async generateRecurringInstances(
    specialClassId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<Date[]> {
    const specialClass = await this.getById(specialClassId);
    if (!specialClass || !specialClass.is_recurring) {
      throw new Error('Special class not found or not recurring');
    }

    const instances: Date[] = [];
    const current = new Date(startDate);
    
    // Start from the special class date
    const classDate = new Date(specialClass.start_date);
    const targetDayOfWeek = classDate.getDay();
    
    // Find the first occurrence on or after startDate
    while (current <= endDate) {
      // Check if current date matches the recurring day of week
      if (current.getDay() === targetDayOfWeek && current >= classDate) {
        instances.push(new Date(current));
      }

      // Increment based on recurrence pattern
      switch (specialClass.recurrence_pattern) {
        case 'weekly':
          current.setDate(current.getDate() + 7);
          break;
        case 'biweekly':
          current.setDate(current.getDate() + 14);
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + 1);
          break;
        default:
          // For non-recurring pattern, we only generate one instance
          return instances;
      }
    }

    return instances;
  }

  // ============================================================================
  // ANALYTICS AND STATISTICS
  // ============================================================================

  static async getStatistics(academicYear: string): Promise<{
    totalClasses: number;
    classesByType: Record<string, number>;
    classesByPriority: Record<string, number>;
    recurringClasses: number;
    totalStudentsCapacity: number;
    upcomingClasses: number;
    pastClasses: number;
  }> {
    const { data, error } = await supabase
      .from('special_classes')
      .select('*')
      .eq('academic_year', academicYear);

    if (error) {
      throw new Error(`Failed to fetch special classes statistics: ${error.message}`);
    }

    const totalClasses = data?.length || 0;
    const recurringClasses = data?.filter(c => c.is_recurring).length || 0;
    const now = new Date();
    const upcomingClasses = data?.filter(c => new Date(c.start_date) > now).length || 0;
    const pastClasses = data?.filter(c => new Date(c.start_date) < now).length || 0;

    const classesByType: Record<string, number> = {};
    const classesByPriority: Record<string, number> = {};
    let totalStudentsCapacity = 0;

    data?.forEach(specialClass => {
      classesByType[specialClass.class_type] = (classesByType[specialClass.class_type] || 0) + 1;
      classesByPriority[specialClass.priority] = (classesByPriority[specialClass.priority] || 0) + 1;
      if (specialClass.max_students) {
        totalStudentsCapacity += specialClass.max_students;
      }
    });

    return {
      totalClasses,
      classesByType,
      classesByPriority,
      recurringClasses,
      totalStudentsCapacity,
      upcomingClasses,
      pastClasses,
    };
  }

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  static validateSpecialClassData(data: SpecialClassFormData): string[] {
    const errors: string[] = [];

    if (!data.title?.trim()) {
      errors.push('Class title is required');
    }

    if (!data.class_type) {
      errors.push('Class type is required');
    }

    if (!data.classroom_id) {
      errors.push('Classroom is required');
    }

    if (!data.start_time) {
      errors.push('Start time is required');
    }

    if (!data.end_time) {
      errors.push('End time is required');
    }

    if (data.start_time >= data.end_time) {
      errors.push('Start time must be before end time');
    }

    if (!data.date) {
      errors.push('Date is required');
    }

    if (data.is_recurring && data.recurring_end_date && new Date(data.date) > new Date(data.recurring_end_date)) {
      errors.push('Date cannot be after recurring end date');
    }

    if (!data.academic_year?.trim()) {
      errors.push('Academic year is required');
    }

    if (data.max_students && data.max_students < 1) {
      errors.push('Maximum students must be greater than 0');
    }

    if (data.priority < 1 || data.priority > 10) {
      errors.push('Priority must be between 1 and 10');
    }

    return errors;
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  static getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Unknown';
  }

  static formatClassTime(startTime: string, endTime: string): string {
    return `${startTime} - ${endTime}`;
  }

  static getClassTypeDisplayName(classType: ClassType): string {
    const displayNames: Record<ClassType, string> = {
      lab: 'Laboratory',
      seminar: 'Seminar',
      guest_lecture: 'Guest Lecture',
      exam: 'Examination',
      workshop: 'Workshop',
    };
    return displayNames[classType] || classType;
  }

  static getRecurrenceDisplayName(pattern: RecurrencePattern): string {
    const displayNames: Record<RecurrencePattern, string> = {
      once: 'One-time',
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
    };
    return displayNames[pattern] || pattern;
  }
}