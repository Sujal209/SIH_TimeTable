import { supabase } from '../supabase';
import { 
  FacultyAvailability, 
  FacultyLeave, 
  FacultyAvailabilityFormData, 
  FacultyLeaveFormData,
  Teacher,
  LeaveStatus 
} from '../../types';

export class FacultyAvailabilityService {
  // ============================================================================
  // FACULTY AVAILABILITY CRUD OPERATIONS
  // ============================================================================

  static async getAllAvailability(filters?: {
    teacher_id?: string;
    academic_year?: string;
    shift_type?: string;
    is_available?: boolean;
  }): Promise<FacultyAvailability[]> {
    let query = supabase
      .from('faculty_availability')
      .select(`
        *,
        teacher:teachers(*)
      `)
      .order('day_of_week')
      .order('start_time');

    // Apply filters if provided
    if (filters?.teacher_id) {
      query = query.eq('teacher_id', filters.teacher_id);
    }
    if (filters?.academic_year) {
      query = query.eq('academic_year', filters.academic_year);
    }
    if (filters?.shift_type) {
      query = query.eq('shift_type', filters.shift_type);
    }
    if (filters?.is_available !== undefined) {
      query = query.eq('is_available', filters.is_available);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch faculty availability: ${error.message}`);
    }

    return data || [];
  }

  static async getAvailabilityById(id: string): Promise<FacultyAvailability | null> {
    const { data, error } = await supabase
      .from('faculty_availability')
      .select(`
        *,
        teacher:teachers(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch availability: ${error.message}`);
    }

    return data;
  }

  static async createAvailability(availabilityData: FacultyAvailabilityFormData): Promise<FacultyAvailability> {
    // Check for time conflicts first
    const hasConflict = await this.checkTimeConflict(
      availabilityData.teacher_id,
      availabilityData.day_of_week,
      availabilityData.start_time,
      availabilityData.end_time,
      availabilityData.shift_type,
      availabilityData.academic_year
    );

    if (hasConflict) {
      throw new Error('Time conflict detected with existing availability slot');
    }

    const { data, error } = await supabase
      .from('faculty_availability')
      .insert({
        teacher_id: availabilityData.teacher_id,
        day_of_week: availabilityData.day_of_week,
        start_time: availabilityData.start_time,
        end_time: availabilityData.end_time,
        shift_type: availabilityData.shift_type,
        preference_level: availabilityData.preference_level,
        is_available: availabilityData.is_available,
        academic_year: availabilityData.academic_year,
      })
      .select(`
        *,
        teacher:teachers(*)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create availability: ${error.message}`);
    }

    return data;
  }

  static async updateAvailability(id: string, availabilityData: Partial<FacultyAvailabilityFormData>): Promise<FacultyAvailability> {
    // If updating time slots, check for conflicts
    if (availabilityData.start_time || availabilityData.end_time || availabilityData.day_of_week) {
      const existingAvailability = await this.getAvailabilityById(id);
      if (existingAvailability) {
        const hasConflict = await this.checkTimeConflict(
          availabilityData.teacher_id || existingAvailability.teacher_id,
          availabilityData.day_of_week ?? existingAvailability.day_of_week,
          availabilityData.start_time || existingAvailability.start_time,
          availabilityData.end_time || existingAvailability.end_time,
          availabilityData.shift_type || existingAvailability.shift_type,
          availabilityData.academic_year || existingAvailability.academic_year,
          id // Exclude current record
        );

        if (hasConflict) {
          throw new Error('Time conflict detected with existing availability slot');
        }
      }
    }

    const updateData = {
      ...availabilityData,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('faculty_availability')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        teacher:teachers(*)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update availability: ${error.message}`);
    }

    return data;
  }

  static async deleteAvailability(id: string): Promise<void> {
    const { error } = await supabase
      .from('faculty_availability')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete availability: ${error.message}`);
    }
  }

  // ============================================================================
  // FACULTY LEAVE MANAGEMENT
  // ============================================================================

  static async getAllLeaves(filters?: {
    teacher_id?: string;
    academic_year?: string;
    status?: LeaveStatus;
    is_recurring?: boolean;
  }): Promise<FacultyLeave[]> {
    let query = supabase
      .from('faculty_leaves')
      .select(`
        *,
        teacher:teachers(*),
        approver:users(*)
      `)
      .order('start_date', { ascending: false });

    // Apply filters if provided
    if (filters?.teacher_id) {
      query = query.eq('teacher_id', filters.teacher_id);
    }
    if (filters?.academic_year) {
      query = query.eq('academic_year', filters.academic_year);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.is_recurring !== undefined) {
      query = query.eq('is_recurring', filters.is_recurring);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch faculty leaves: ${error.message}`);
    }

    return data || [];
  }

  static async getLeaveById(id: string): Promise<FacultyLeave | null> {
    const { data, error } = await supabase
      .from('faculty_leaves')
      .select(`
        *,
        teacher:teachers(*),
        approver:users(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch leave: ${error.message}`);
    }

    return data;
  }

  static async createLeave(leaveData: FacultyLeaveFormData): Promise<FacultyLeave> {
    // Validate leave dates
    const startDate = new Date(leaveData.start_date);
    const endDate = new Date(leaveData.end_date);
    
    if (startDate > endDate) {
      throw new Error('Start date cannot be after end date');
    }

    // Check for overlapping leaves
    const hasOverlap = await this.checkLeaveOverlap(
      leaveData.teacher_id,
      leaveData.start_date,
      leaveData.end_date
    );

    if (hasOverlap) {
      throw new Error('Leave dates overlap with existing leave');
    }

    const { data, error } = await supabase
      .from('faculty_leaves')
      .insert({
        teacher_id: leaveData.teacher_id,
        leave_type: leaveData.leave_type,
        start_date: leaveData.start_date,
        end_date: leaveData.end_date,
        reason: leaveData.reason,
        is_recurring: leaveData.is_recurring,
        recurring_day: leaveData.recurring_day,
        recurring_start_time: leaveData.recurring_start_time,
        recurring_end_time: leaveData.recurring_end_time,
        academic_year: leaveData.academic_year,
        status: 'pending', // Default status
      })
      .select(`
        *,
        teacher:teachers(*),
        approver:users(*)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create leave: ${error.message}`);
    }

    return data;
  }

  static async updateLeave(id: string, leaveData: Partial<FacultyLeaveFormData>): Promise<FacultyLeave> {
    const updateData = {
      ...leaveData,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('faculty_leaves')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        teacher:teachers(*),
        approver:users(*)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update leave: ${error.message}`);
    }

    return data;
  }

  static async approveLeave(id: string, approvedBy: string): Promise<FacultyLeave> {
    return this.updateLeave(id, {
      status: 'approved',
      approved_by: approvedBy,
    });
  }

  static async rejectLeave(id: string, approvedBy: string): Promise<FacultyLeave> {
    return this.updateLeave(id, {
      status: 'rejected',
      approved_by: approvedBy,
    });
  }

  static async deleteLeave(id: string): Promise<void> {
    const { error } = await supabase
      .from('faculty_leaves')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete leave: ${error.message}`);
    }
  }

  // ============================================================================
  // AVAILABILITY QUERIES AND HELPERS
  // ============================================================================

  static async getTeacherAvailability(
    teacherId: string, 
    academicYear: string, 
    dayOfWeek?: number
  ): Promise<FacultyAvailability[]> {
    let query = supabase
      .from('faculty_availability')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('academic_year', academicYear)
      .eq('is_available', true)
      .order('day_of_week')
      .order('start_time');

    if (dayOfWeek !== undefined) {
      query = query.eq('day_of_week', dayOfWeek);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch teacher availability: ${error.message}`);
    }

    return data || [];
  }

  static async getTeacherLeaves(
    teacherId: string, 
    academicYear: string,
    status?: LeaveStatus
  ): Promise<FacultyLeave[]> {
    let query = supabase
      .from('faculty_leaves')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('academic_year', academicYear)
      .order('start_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch teacher leaves: ${error.message}`);
    }

    return data || [];
  }

  static async isTeacherAvailable(
    teacherId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    academicYear: string,
    shiftType: string
  ): Promise<boolean> {
    // Check availability slots
    const { data: availabilitySlots, error: availabilityError } = await supabase
      .from('faculty_availability')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('day_of_week', dayOfWeek)
      .eq('academic_year', academicYear)
      .eq('shift_type', shiftType)
      .eq('is_available', true)
      .lte('start_time', startTime)
      .gte('end_time', endTime);

    if (availabilityError) {
      throw new Error(`Failed to check availability: ${availabilityError.message}`);
    }

    if (!availabilitySlots || availabilitySlots.length === 0) {
      return false; // No matching availability slot
    }

    // Check for approved leaves on the specific date
    // For now, we'll assume the date is within the academic year
    // A more sophisticated implementation would check specific dates
    const { data: leaves, error: leavesError } = await supabase
      .from('faculty_leaves')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('academic_year', academicYear)
      .eq('status', 'approved')
      .or(`is_recurring.eq.false,and(is_recurring.eq.true,recurring_day.eq.${dayOfWeek})`);

    if (leavesError) {
      throw new Error(`Failed to check leaves: ${leavesError.message}`);
    }

    // If there are any conflicting leaves, teacher is not available
    if (leaves && leaves.length > 0) {
      // Check for time conflicts with recurring leaves
      const conflictingLeaves = leaves.filter(leave => {
        if (leave.is_recurring && leave.recurring_day === dayOfWeek) {
          return (
            (leave.recurring_start_time <= startTime && leave.recurring_end_time > startTime) ||
            (leave.recurring_start_time < endTime && leave.recurring_end_time >= endTime) ||
            (leave.recurring_start_time >= startTime && leave.recurring_end_time <= endTime)
          );
        }
        return false; // For non-recurring leaves, we'd need specific date checking
      });

      if (conflictingLeaves.length > 0) {
        return false;
      }
    }

    return true;
  }

  // ============================================================================
  // CONFLICT DETECTION
  // ============================================================================

  static async checkTimeConflict(
    teacherId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    shiftType: string,
    academicYear: string,
    excludeId?: string
  ): Promise<boolean> {
    let query = supabase
      .from('faculty_availability')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('day_of_week', dayOfWeek)
      .eq('shift_type', shiftType)
      .eq('academic_year', academicYear)
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

  static async checkLeaveOverlap(
    teacherId: string,
    startDate: string,
    endDate: string,
    excludeId?: string
  ): Promise<boolean> {
    let query = supabase
      .from('faculty_leaves')
      .select('id')
      .eq('teacher_id', teacherId)
      .neq('status', 'rejected')
      .or(`and(start_date.lte.${startDate},end_date.gte.${startDate}),and(start_date.lte.${endDate},end_date.gte.${endDate}),and(start_date.gte.${startDate},end_date.lte.${endDate})`);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to check leave overlap: ${error.message}`);
    }

    return data && data.length > 0;
  }

  // ============================================================================
  // ANALYTICS AND STATISTICS
  // ============================================================================

  static async getAvailabilityStatistics(academicYear: string): Promise<{
    totalSlots: number;
    availableSlots: number;
    unavailableSlots: number;
    averagePreferenceLevel: number;
    slotsByShift: Record<string, number>;
    slotsByDay: Record<number, number>;
  }> {
    const { data, error } = await supabase
      .from('faculty_availability')
      .select('*')
      .eq('academic_year', academicYear);

    if (error) {
      throw new Error(`Failed to fetch availability statistics: ${error.message}`);
    }

    const totalSlots = data?.length || 0;
    const availableSlots = data?.filter(slot => slot.is_available).length || 0;
    const unavailableSlots = totalSlots - availableSlots;

    const averagePreferenceLevel = totalSlots > 0 
      ? data!.reduce((sum, slot) => sum + slot.preference_level, 0) / totalSlots 
      : 0;

    const slotsByShift: Record<string, number> = {};
    const slotsByDay: Record<number, number> = {};

    data?.forEach(slot => {
      slotsByShift[slot.shift_type] = (slotsByShift[slot.shift_type] || 0) + 1;
      slotsByDay[slot.day_of_week] = (slotsByDay[slot.day_of_week] || 0) + 1;
    });

    return {
      totalSlots,
      availableSlots,
      unavailableSlots,
      averagePreferenceLevel: Math.round(averagePreferenceLevel * 100) / 100,
      slotsByShift,
      slotsByDay,
    };
  }

  static async getLeaveStatistics(academicYear: string): Promise<{
    totalLeaves: number;
    approvedLeaves: number;
    pendingLeaves: number;
    rejectedLeaves: number;
    recurringLeaves: number;
    leavesByType: Record<string, number>;
    averageLeaveDuration: number;
  }> {
    const { data, error } = await supabase
      .from('faculty_leaves')
      .select('*')
      .eq('academic_year', academicYear);

    if (error) {
      throw new Error(`Failed to fetch leave statistics: ${error.message}`);
    }

    const totalLeaves = data?.length || 0;
    const approvedLeaves = data?.filter(leave => leave.status === 'approved').length || 0;
    const pendingLeaves = data?.filter(leave => leave.status === 'pending').length || 0;
    const rejectedLeaves = data?.filter(leave => leave.status === 'rejected').length || 0;
    const recurringLeaves = data?.filter(leave => leave.is_recurring).length || 0;

    const leavesByType: Record<string, number> = {};
    let totalDuration = 0;

    data?.forEach(leave => {
      leavesByType[leave.leave_type] = (leavesByType[leave.leave_type] || 0) + 1;
      
      // Calculate duration in days
      const startDate = new Date(leave.start_date);
      const endDate = new Date(leave.end_date);
      const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      totalDuration += duration;
    });

    const averageLeaveDuration = totalLeaves > 0 ? totalDuration / totalLeaves : 0;

    return {
      totalLeaves,
      approvedLeaves,
      pendingLeaves,
      rejectedLeaves,
      recurringLeaves,
      leavesByType,
      averageLeaveDuration: Math.round(averageLeaveDuration * 100) / 100,
    };
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  static getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Unknown';
  }

  static formatTimeSlot(startTime: string, endTime: string): string {
    return `${startTime} - ${endTime}`;
  }

  static calculateSlotDuration(startTime: string, endTime: string): number {
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // Duration in minutes
  }
}