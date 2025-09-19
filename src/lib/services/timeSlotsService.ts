import { supabase } from '../supabase';
import { TimeSlot, TimeSlotFormData, DayOfWeek } from '../../types';

export class TimeSlotsService {
  static async getAll(): Promise<TimeSlot[]> {
    const { data, error } = await supabase
      .from('time_slots')
      .select('*')
      .order('day')
      .order('start_time');

    if (error) {
      throw new Error(`Failed to fetch time slots: ${error.message}`);
    }

    return data || [];
  }

  static async getById(id: string): Promise<TimeSlot | null> {
    const { data, error } = await supabase
      .from('time_slots')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Time slot not found
      }
      throw new Error(`Failed to fetch time slot: ${error.message}`);
    }

    return data;
  }

  static async create(timeSlotData: TimeSlotFormData): Promise<TimeSlot> {
    const duration = this.calculateDuration(timeSlotData.start_time, timeSlotData.end_time);
    
    const { data, error } = await supabase
      .from('time_slots')
      .insert({
        day: timeSlotData.day,
        start_time: timeSlotData.start_time,
        end_time: timeSlotData.end_time,
        duration,
        is_break: timeSlotData.slot_type === 'break',
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create time slot: ${error.message}`);
    }

    return data;
  }

  static async update(id: string, timeSlotData: Partial<TimeSlotFormData>): Promise<TimeSlot> {
    const updateData: any = {
      day: timeSlotData.day,
      start_time: timeSlotData.start_time,
      end_time: timeSlotData.end_time,
      is_break: timeSlotData.slot_type === 'break',
      updated_at: new Date().toISOString(),
    };

    if (timeSlotData.start_time && timeSlotData.end_time) {
      updateData.duration = this.calculateDuration(timeSlotData.start_time, timeSlotData.end_time);
    }

    const { data, error } = await supabase
      .from('time_slots')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update time slot: ${error.message}`);
    }

    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('time_slots')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete time slot: ${error.message}`);
    }
  }

  static async getByDay(day: DayOfWeek): Promise<TimeSlot[]> {
    const { data, error } = await supabase
      .from('time_slots')
      .select('*')
      .eq('day', day)
      .order('start_time');

    if (error) {
      throw new Error(`Failed to fetch time slots by day: ${error.message}`);
    }

    return data || [];
  }

  static async getClassSlots(): Promise<TimeSlot[]> {
    const { data, error } = await supabase
      .from('time_slots')
      .select('*')
      .eq('is_break', false)
      .order('day')
      .order('start_time');

    if (error) {
      throw new Error(`Failed to fetch class time slots: ${error.message}`);
    }

    return data || [];
  }

  static async getBreakSlots(): Promise<TimeSlot[]> {
    const { data, error } = await supabase
      .from('time_slots')
      .select('*')
      .eq('is_break', true)
      .order('day')
      .order('start_time');

    if (error) {
      throw new Error(`Failed to fetch break time slots: ${error.message}`);
    }

    return data || [];
  }

  static async checkTimeConflict(
    day: DayOfWeek, 
    startTime: string, 
    endTime: string, 
    excludeId?: string
  ): Promise<boolean> {
    let query = supabase
      .from('time_slots')
      .select('id')
      .eq('day', day)
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

  static async getConsecutiveSlots(day: DayOfWeek, startSlotId: string, count: number = 2): Promise<TimeSlot[]> {
    // Get all slots for the day
    const daySlots = await this.getByDay(day);
    const startIndex = daySlots.findIndex(slot => slot.id === startSlotId);
    
    if (startIndex === -1 || startIndex + count > daySlots.length) {
      return [];
    }

    return daySlots.slice(startIndex, startIndex + count);
  }

  static async createBulkTimeSlots(timeSlots: TimeSlotFormData[]): Promise<TimeSlot[]> {
    const slotsWithDuration = timeSlots.map(slot => ({
      ...slot,
      duration: this.calculateDuration(slot.start_time, slot.end_time)
    }));

    const { data, error } = await supabase
      .from('time_slots')
      .insert(slotsWithDuration)
      .select('*');

    if (error) {
      throw new Error(`Failed to create time slots: ${error.message}`);
    }

    return data || [];
  }

  static async getWeekSchedule(): Promise<Record<DayOfWeek, TimeSlot[]>> {
    const allSlots = await this.getAll();
    const schedule: Record<DayOfWeek, TimeSlot[]> = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
    };

    allSlots.forEach(slot => {
      if (slot.day) {
        schedule[slot.day].push(slot);
      }
    });

    return schedule;
  }

  static calculateDuration(startTime: string, endTime: string): number {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    return endTotalMinutes - startTotalMinutes;
  }

  static formatTimeSlot(slot: TimeSlot): string {
    return `${slot.start_time} - ${slot.end_time}`;
  }

  static isTimeSlotAvailable(slot: TimeSlot): boolean {
    return !slot.is_break;
  }

  static getTotalClassDuration(slots: TimeSlot[]): number {
    return slots
      .filter(slot => !slot.is_break)
      .reduce((total, slot) => total + slot.duration, 0);
  }
}