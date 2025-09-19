import { supabase } from '../supabase';
import { 
  Batch, 
  Teacher, 
  Subject, 
  Classroom, 
  TimeSlot,
  FacultyAvailability as FacultyAvailabilityType,
  SpecialClass,
  TimetableEntry,
  TimetableGenerationResult,
  ConflictType,
  TimetableConflict
} from '../../types';

// Configuration constants
const TIMETABLE_CONFIG = {
  DAYS_OF_WEEK: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  STANDARD_PERIOD_DURATION: 50, // minutes
  LAB_PERIOD_DURATION: 110, // 2×50 + 10 minute gap
  BREAK_DURATION: 25, // minutes
  MAX_CONTINUOUS_HOURS: 3,
  LUNCH_BREAK_DURATION: 30, // minutes
  MIN_DAILY_HOURS: 5,
  MAX_DAILY_HOURS: 8,
  STANDARD_WORKING_HOURS: {
    start: '09:00',
    end: '17:00'
  }
};

interface TimetableConstraints {
  batchId: string;
  academicYear: string;
  maxTeacherHoursPerDay: number;
  includeLunchBreak: boolean;
  respectFacultyAvailability: boolean;
  includeSpecialClasses: boolean;
}

interface TimetableSlot {
  day: number; // 0-6 (Sunday to Saturday)
  timeSlot: TimeSlot;
  batchId: string;
  subjectId: string | null;
  teacherId: string | null;
  classroomId: string | null;
  isLab: boolean;
  isBreak: boolean;
  isLunch: boolean;
  isSpecialClass: boolean;
  specialClassId: string | null;
  duration: number; // in minutes
}

export class TimetableGenerationEngine {
  private teachers: Teacher[] = [];
  private subjects: Subject[] = [];
  private classrooms: Classroom[] = [];
  private timeSlots: TimeSlot[] = [];
  private facultyAvailability: FacultyAvailabilityType[] = [];
  private specialClasses: SpecialClass[] = [];
  private constraints: TimetableConstraints;
  private generatedSlots: TimetableSlot[] = [];
  private conflicts: TimetableConflict[] = [];

  constructor(constraints: TimetableConstraints) {
    this.constraints = constraints;
  }

  /**
   * Main method to generate a complete timetable
   */
  async generateTimetable(): Promise<TimetableGenerationResult> {
    try {
      console.log('Starting timetable generation...');
      
      // Step 1: Load all required data
      await this.loadRequiredData();
      
      // Step 2: Initialize time slots for the week
      this.initializeTimeSlots();
      
      // Step 3: Place special classes first (they have fixed times)
      await this.placeSpecialClasses();
      
      // Step 4: Calculate subject requirements
      const subjectRequirements = await this.calculateSubjectRequirements();
      
      // Step 5: Generate timetable using constraint-based scheduling
      await this.scheduleSubjects(subjectRequirements);
      
      // Step 6: Add breaks and lunch periods
      this.insertBreaksAndLunch();
      
      // Step 7: Validate and detect conflicts
      this.validateTimetable();
      
      // Step 8: Save to database if no critical conflicts
      const timetableEntries = await this.saveTimetable();
      
      console.log('Timetable generation completed successfully');
      
      return {
        success: true,
        timetableEntries,
        conflicts: this.conflicts,
        statistics: this.generateStatistics(),
        generatedAt: new Date().toISOString(),
        constraints: this.constraints
      };
      
    } catch (error) {
      console.error('Timetable generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        conflicts: this.conflicts,
        generatedAt: new Date().toISOString(),
        constraints: this.constraints
      };
    }
  }

  /**
   * Load all required data from database
   */
  private async loadRequiredData(): Promise<void> {
    console.log('Loading required data...');
    
    const [teachersData, subjectsData, classroomsData, timeSlotsData] = await Promise.all([
      this.loadTeachers(),
      this.loadSubjects(),
      this.loadClassrooms(),
      this.loadTimeSlots()
    ]);

    this.teachers = teachersData;
    this.subjects = subjectsData;
    this.classrooms = classroomsData;
    this.timeSlots = timeSlotsData;

    if (this.constraints.respectFacultyAvailability) {
      this.facultyAvailability = await this.loadFacultyAvailability();
    }

    if (this.constraints.includeSpecialClasses) {
      this.specialClasses = await this.loadSpecialClasses();
    }

    console.log(`Loaded: ${this.teachers.length} teachers, ${this.subjects.length} subjects, ${this.classrooms.length} classrooms`);
  }

  private async loadTeachers(): Promise<Teacher[]> {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('is_active', true);
    
    if (error) throw new Error(`Failed to load teachers: ${error.message}`);
    return data || [];
  }

  private async loadSubjects(): Promise<Subject[]> {
    const { data, error } = await supabase
      .from('batch_subjects')
      .select(`
        *,
        subject:subjects(*),
        batch:batches(*)
      `)
      .eq('batch_id', this.constraints.batchId)
      .eq('academic_year', this.constraints.academicYear);
    
    if (error) throw new Error(`Failed to load subjects: ${error.message}`);
    
    // Transform to include subject details
    return (data || []).map(bs => ({
      ...bs.subject,
      periods_per_week: bs.periods_per_week,
      is_lab: bs.is_lab,
      is_elective: bs.is_elective,
      teacher_id: bs.teacher_id
    }));
  }

  private async loadClassrooms(): Promise<Classroom[]> {
    const { data, error } = await supabase
      .from('classrooms')
      .select('*')
      .eq('is_active', true);
    
    if (error) throw new Error(`Failed to load classrooms: ${error.message}`);
    return data || [];
  }

  private async loadTimeSlots(): Promise<TimeSlot[]> {
    const { data, error } = await supabase
      .from('time_slots')
      .select('*')
      .order('start_time');
    
    if (error) throw new Error(`Failed to load time slots: ${error.message}`);
    return data || [];
  }

  private async loadFacultyAvailability(): Promise<FacultyAvailabilityType[]> {
    const { data, error } = await supabase
      .from('faculty_availability')
      .select('*')
      .eq('academic_year', this.constraints.academicYear)
      .eq('is_available', true);
    
    if (error) throw new Error(`Failed to load faculty availability: ${error.message}`);
    return data || [];
  }

  private async loadSpecialClasses(): Promise<SpecialClass[]> {
    const { data, error } = await supabase
      .from('special_classes')
      .select('*')
      .eq('batch_id', this.constraints.batchId)
      .eq('academic_year', this.constraints.academicYear);
    
    if (error) throw new Error(`Failed to load special classes: ${error.message}`);
    return data || [];
  }

  /**
   * Initialize time slots for the week
   */
  private initializeTimeSlots(): void {
    console.log('Initializing time slots...');
    this.generatedSlots = [];

    for (let day = 1; day <= 6; day++) { // Monday to Saturday
      for (const timeSlot of this.timeSlots) {
        this.generatedSlots.push({
          day,
          timeSlot,
          batchId: this.constraints.batchId,
          subjectId: null,
          teacherId: null,
          classroomId: null,
          isLab: false,
          isBreak: false,
          isLunch: false,
          isSpecialClass: false,
          specialClassId: null,
          duration: TIMETABLE_CONFIG.STANDARD_PERIOD_DURATION
        });
      }
    }
  }

  /**
   * Place special classes first as they have fixed times
   */
  private async placeSpecialClasses(): Promise<void> {
    if (!this.constraints.includeSpecialClasses || this.specialClasses.length === 0) {
      return;
    }

    console.log('Placing special classes...');

    for (const specialClass of this.specialClasses) {
      const dayOfWeek = new Date(specialClass.date).getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Find matching time slot
      const matchingSlot = this.generatedSlots.find(slot => 
        slot.day === dayOfWeek &&
        slot.timeSlot.start_time <= specialClass.start_time &&
        slot.timeSlot.end_time >= specialClass.end_time &&
        !slot.subjectId && !slot.isSpecialClass
      );

      if (matchingSlot) {
        matchingSlot.isSpecialClass = true;
        matchingSlot.specialClassId = specialClass.id;
        matchingSlot.teacherId = specialClass.teacher_id;
        matchingSlot.classroomId = specialClass.classroom_id;
        
        console.log(`Placed special class: ${specialClass.title} on ${TIMETABLE_CONFIG.DAYS_OF_WEEK[dayOfWeek - 1]}`);
      } else {
        this.conflicts.push({
          type: 'SPECIAL_CLASS_CONFLICT' as ConflictType,
          description: `Cannot place special class: ${specialClass.title}`,
          day: dayOfWeek,
          timeSlot: specialClass.start_time,
          involvedEntities: [specialClass.id]
        });
      }
    }
  }

  /**
   * Calculate subject requirements based on periods per week
   */
  private async calculateSubjectRequirements(): Promise<Map<string, { periods: number; isLab: boolean; teacherId: string }>> {
    console.log('Calculating subject requirements...');
    
    const requirements = new Map<string, { periods: number; isLab: boolean; teacherId: string }>();
    
    for (const subject of this.subjects) {
      requirements.set(subject.id, {
        periods: subject.periods_per_week || 3,
        isLab: subject.is_lab || false,
        teacherId: subject.teacher_id || ''
      });
    }

    return requirements;
  }

  /**
   * Main scheduling algorithm using constraint-based approach
   */
  private async scheduleSubjects(subjectRequirements: Map<string, { periods: number; isLab: boolean; teacherId: string }>): Promise<void> {
    console.log('Starting subject scheduling...');

    // Sort subjects by constraints (labs first, then by periods per week)
    const sortedSubjects = Array.from(subjectRequirements.entries()).sort((a, b) => {
      if (a[1].isLab && !b[1].isLab) return -1;
      if (!a[1].isLab && b[1].isLab) return 1;
      return b[1].periods - a[1].periods; // More periods first
    });

    for (const [subjectId, requirements] of sortedSubjects) {
      await this.scheduleSubject(subjectId, requirements);
    }
  }

  /**
   * Schedule a single subject considering all constraints
   */
  private async scheduleSubject(
    subjectId: string, 
    requirements: { periods: number; isLab: boolean; teacherId: string }
  ): Promise<void> {
    const subject = this.subjects.find(s => s.id === subjectId);
    if (!subject) return;

    console.log(`Scheduling subject: ${subject.name} (${requirements.periods} periods, Lab: ${requirements.isLab})`);

    let periodsScheduled = 0;
    const targetPeriods = requirements.periods;

    // Try to distribute periods across different days
    const daysToTry = this.shuffleArray([1, 2, 3, 4, 5, 6]); // Monday to Saturday

    for (const day of daysToTry) {
      if (periodsScheduled >= targetPeriods) break;

      if (requirements.isLab) {
        // Schedule lab (needs 2 consecutive periods)
        const success = await this.scheduleLabPeriod(subjectId, requirements.teacherId, day);
        if (success) periodsScheduled += 2;
      } else {
        // Schedule regular period
        const success = await this.scheduleRegularPeriod(subjectId, requirements.teacherId, day);
        if (success) periodsScheduled += 1;
      }

      // Don't over-schedule
      if (periodsScheduled >= targetPeriods) break;
    }

    if (periodsScheduled < targetPeriods) {
      this.conflicts.push({
        type: 'INSUFFICIENT_PERIODS' as ConflictType,
        description: `Could not schedule all periods for ${subject.name}. Scheduled: ${periodsScheduled}/${targetPeriods}`,
        involvedEntities: [subjectId]
      });
    }
  }

  /**
   * Schedule a lab period (2 consecutive slots)
   */
  private async scheduleLabPeriod(subjectId: string, teacherId: string, day: number): Promise<boolean> {
    const availableSlots = this.generatedSlots.filter(slot => 
      slot.day === day && 
      !slot.subjectId && 
      !slot.isSpecialClass &&
      !slot.isBreak &&
      !slot.isLunch
    );

    // Find two consecutive available slots
    for (let i = 0; i < availableSlots.length - 1; i++) {
      const slot1 = availableSlots[i];
      const slot2 = availableSlots[i + 1];

      if (this.areConsecutiveTimeSlots(slot1.timeSlot, slot2.timeSlot)) {
        // Check all constraints for both slots
        if (await this.checkConstraints(slot1, teacherId) && 
            await this.checkConstraints(slot2, teacherId)) {
          
          const classroom = await this.findAvailableClassroom(day, slot1.timeSlot, slot2.timeSlot, true);
          
          if (classroom) {
            // Schedule both slots
            slot1.subjectId = subjectId;
            slot1.teacherId = teacherId;
            slot1.classroomId = classroom.id;
            slot1.isLab = true;
            slot1.duration = TIMETABLE_CONFIG.LAB_PERIOD_DURATION;

            slot2.subjectId = subjectId;
            slot2.teacherId = teacherId;
            slot2.classroomId = classroom.id;
            slot2.isLab = true;
            slot2.duration = 0; // Second slot is part of the first

            console.log(`Scheduled lab for ${subjectId} on ${TIMETABLE_CONFIG.DAYS_OF_WEEK[day - 1]} at ${slot1.timeSlot.start_time}`);
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Schedule a regular period
   */
  private async scheduleRegularPeriod(subjectId: string, teacherId: string, day: number): Promise<boolean> {
    const availableSlots = this.generatedSlots.filter(slot => 
      slot.day === day && 
      !slot.subjectId && 
      !slot.isSpecialClass &&
      !slot.isBreak &&
      !slot.isLunch
    );

    for (const slot of availableSlots) {
      if (await this.checkConstraints(slot, teacherId)) {
        const classroom = await this.findAvailableClassroom(day, slot.timeSlot, slot.timeSlot, false);
        
        if (classroom) {
          slot.subjectId = subjectId;
          slot.teacherId = teacherId;
          slot.classroomId = classroom.id;
          
          console.log(`Scheduled regular period for ${subjectId} on ${TIMETABLE_CONFIG.DAYS_OF_WEEK[day - 1]} at ${slot.timeSlot.start_time}`);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check all constraints for a given slot and teacher
   */
  private async checkConstraints(slot: TimetableSlot, teacherId: string): Promise<boolean> {
    // Check teacher availability
    if (this.constraints.respectFacultyAvailability) {
      const isAvailable = this.facultyAvailability.some(fa => 
        fa.teacher_id === teacherId &&
        fa.day_of_week === slot.day &&
        fa.start_time <= slot.timeSlot.start_time &&
        fa.end_time >= slot.timeSlot.end_time &&
        fa.is_available
      );

      if (!isAvailable) return false;
    }

    // Check teacher's daily hour limit
    const teacherHoursToday = this.getTeacherHoursForDay(teacherId, slot.day);
    if (teacherHoursToday >= this.constraints.maxTeacherHoursPerDay) {
      return false;
    }

    // Check for teacher conflicts (no double booking)
    const hasTeacherConflict = this.generatedSlots.some(existingSlot =>
      existingSlot.day === slot.day &&
      existingSlot.teacherId === teacherId &&
      existingSlot.timeSlot.start_time === slot.timeSlot.start_time &&
      existingSlot !== slot
    );

    return !hasTeacherConflict;
  }

  /**
   * Find an available classroom for the given time
   */
  private async findAvailableClassroom(
    day: number, 
    startTimeSlot: TimeSlot, 
    endTimeSlot: TimeSlot, 
    isLab: boolean
  ): Promise<Classroom | null> {
    
    for (const classroom of this.classrooms) {
      // Check if classroom is suitable for labs
      if (isLab && classroom.room_type !== 'lab') continue;
      
      // Check for classroom conflicts
      const hasConflict = this.generatedSlots.some(slot =>
        slot.day === day &&
        slot.classroomId === classroom.id &&
        ((slot.timeSlot.start_time <= startTimeSlot.start_time && slot.timeSlot.end_time > startTimeSlot.start_time) ||
         (slot.timeSlot.start_time < endTimeSlot.end_time && slot.timeSlot.end_time >= endTimeSlot.end_time) ||
         (slot.timeSlot.start_time >= startTimeSlot.start_time && slot.timeSlot.end_time <= endTimeSlot.end_time))
      );

      if (!hasConflict) {
        return classroom;
      }
    }

    return null;
  }

  /**
   * Insert breaks and lunch periods
   */
  private insertBreaksAndLunch(): void {
    console.log('Inserting breaks and lunch periods...');

    for (let day = 1; day <= 6; day++) {
      this.insertBreaksForDay(day);
      if (this.constraints.includeLunchBreak) {
        this.insertLunchForDay(day);
      }
    }
  }

  private insertBreaksForDay(day: number): void {
    const daySlots = this.generatedSlots
      .filter(slot => slot.day === day && slot.subjectId)
      .sort((a, b) => a.timeSlot.start_time.localeCompare(b.timeSlot.start_time));

    let continuousHours = 0;
    
    for (let i = 0; i < daySlots.length; i++) {
      const slot = daySlots[i];
      continuousHours++;

      // Insert break after continuous hours
      if (continuousHours >= TIMETABLE_CONFIG.MAX_CONTINUOUS_HOURS) {
        const nextSlot = daySlots[i + 1];
        if (nextSlot) {
          // Find empty slot between current and next for break
          const breakSlot = this.generatedSlots.find(s =>
            s.day === day &&
            !s.subjectId &&
            !s.isBreak &&
            !s.isLunch &&
            s.timeSlot.start_time > slot.timeSlot.end_time &&
            s.timeSlot.end_time <= nextSlot.timeSlot.start_time
          );

          if (breakSlot) {
            breakSlot.isBreak = true;
            breakSlot.duration = TIMETABLE_CONFIG.BREAK_DURATION;
            continuousHours = 0;
          }
        }
      }
    }
  }

  private insertLunchForDay(day: number): void {
    const daySlots = this.generatedSlots
      .filter(slot => slot.day === day && slot.subjectId)
      .sort((a, b) => a.timeSlot.start_time.localeCompare(b.timeSlot.start_time));

    // Try to place lunch around noon (12:00-13:00)
    const lunchTimeSlot = this.generatedSlots.find(slot =>
      slot.day === day &&
      !slot.subjectId &&
      !slot.isBreak &&
      !slot.isLunch &&
      slot.timeSlot.start_time >= '12:00' &&
      slot.timeSlot.end_time <= '13:30'
    );

    if (lunchTimeSlot) {
      lunchTimeSlot.isLunch = true;
      lunchTimeSlot.duration = TIMETABLE_CONFIG.LUNCH_BREAK_DURATION;
    }
  }

  /**
   * Validate the generated timetable and detect conflicts
   */
  private validateTimetable(): void {
    console.log('Validating timetable...');

    // Check for teacher double-booking
    this.validateTeacherConflicts();

    // Check for classroom double-booking
    this.validateClassroomConflicts();

    // Check daily hour limits
    this.validateDailyHourLimits();

    // Check minimum periods per subject
    this.validateSubjectPeriods();
  }

  private validateTeacherConflicts(): void {
    const teacherSlots = new Map<string, TimetableSlot[]>();

    // Group slots by teacher
    for (const slot of this.generatedSlots.filter(s => s.teacherId)) {
      if (!teacherSlots.has(slot.teacherId!)) {
        teacherSlots.set(slot.teacherId!, []);
      }
      teacherSlots.get(slot.teacherId!)!.push(slot);
    }

    // Check for conflicts
    for (const [teacherId, slots] of teacherSlots) {
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          const slot1 = slots[i];
          const slot2 = slots[j];

          if (slot1.day === slot2.day && 
              this.timeSlotOverlap(slot1.timeSlot, slot2.timeSlot)) {
            
            this.conflicts.push({
              type: 'TEACHER_CONFLICT' as ConflictType,
              description: `Teacher double-booked`,
              day: slot1.day,
              timeSlot: slot1.timeSlot.start_time,
              involvedEntities: [teacherId, slot1.subjectId!, slot2.subjectId!]
            });
          }
        }
      }
    }
  }

  private validateClassroomConflicts(): void {
    const classroomSlots = new Map<string, TimetableSlot[]>();

    // Group slots by classroom
    for (const slot of this.generatedSlots.filter(s => s.classroomId)) {
      if (!classroomSlots.has(slot.classroomId!)) {
        classroomSlots.set(slot.classroomId!, []);
      }
      classroomSlots.get(slot.classroomId!)!.push(slot);
    }

    // Check for conflicts
    for (const [classroomId, slots] of classroomSlots) {
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          const slot1 = slots[i];
          const slot2 = slots[j];

          if (slot1.day === slot2.day && 
              this.timeSlotOverlap(slot1.timeSlot, slot2.timeSlot)) {
            
            this.conflicts.push({
              type: 'CLASSROOM_CONFLICT' as ConflictType,
              description: `Classroom double-booked`,
              day: slot1.day,
              timeSlot: slot1.timeSlot.start_time,
              involvedEntities: [classroomId, slot1.subjectId!, slot2.subjectId!]
            });
          }
        }
      }
    }
  }

  private validateDailyHourLimits(): void {
    for (const teacher of this.teachers) {
      for (let day = 1; day <= 6; day++) {
        const dailyHours = this.getTeacherHoursForDay(teacher.id, day);
        if (dailyHours > this.constraints.maxTeacherHoursPerDay) {
          this.conflicts.push({
            type: 'TEACHER_OVERLOAD' as ConflictType,
            description: `Teacher exceeds daily hour limit: ${dailyHours}/${this.constraints.maxTeacherHoursPerDay}`,
            day,
            involvedEntities: [teacher.id]
          });
        }
      }
    }
  }

  private validateSubjectPeriods(): void {
    const subjectPeriods = new Map<string, number>();

    // Count actual periods scheduled
    for (const slot of this.generatedSlots.filter(s => s.subjectId)) {
      const count = subjectPeriods.get(slot.subjectId!) || 0;
      subjectPeriods.set(slot.subjectId!, count + (slot.isLab && slot.duration > 0 ? 2 : 1));
    }

    // Check against requirements
    for (const subject of this.subjects) {
      const scheduled = subjectPeriods.get(subject.id) || 0;
      const required = subject.periods_per_week || 3;

      if (scheduled < required) {
        this.conflicts.push({
          type: 'INSUFFICIENT_PERIODS' as ConflictType,
          description: `Subject ${subject.name} has insufficient periods: ${scheduled}/${required}`,
          involvedEntities: [subject.id]
        });
      }
    }
  }

  /**
   * Save the generated timetable to database
   */
  private async saveTimetable(): Promise<TimetableEntry[]> {
    console.log('Saving timetable to database...');

    const timetableEntries: TimetableEntry[] = [];

    for (const slot of this.generatedSlots.filter(s => s.subjectId || s.isSpecialClass || s.isBreak || s.isLunch)) {
      const entry: TimetableEntry = {
        id: '', // Will be set by database
        batch_id: slot.batchId,
        subject_id: slot.subjectId,
        teacher_id: slot.teacherId,
        classroom_id: slot.classroomId,
        time_slot_id: slot.timeSlot.id,
        day_of_week: slot.day,
        academic_year: this.constraints.academicYear,
        is_lab: slot.isLab,
        is_break: slot.isBreak,
        is_lunch: slot.isLunch,
        special_class_id: slot.specialClassId,
        duration_minutes: slot.duration,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      timetableEntries.push(entry);
    }

    // Save to database
    const { data, error } = await supabase
      .from('timetable_entries')
      .insert(timetableEntries)
      .select();

    if (error) {
      console.error('Error saving timetable:', error);
      throw new Error(`Failed to save timetable: ${error.message}`);
    }

    console.log(`Saved ${data?.length} timetable entries`);
    return data || [];
  }

  // Helper methods
  private areConsecutiveTimeSlots(slot1: TimeSlot, slot2: TimeSlot): boolean {
    return slot1.end_time === slot2.start_time || 
           this.getTimeDifferenceMinutes(slot1.end_time, slot2.start_time) <= 10;
  }

  private timeSlotOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
    return !(slot1.end_time <= slot2.start_time || slot2.end_time <= slot1.start_time);
  }

  private getTimeDifferenceMinutes(time1: string, time2: string): number {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    return Math.abs((h2 * 60 + m2) - (h1 * 60 + m1));
  }

  private getTeacherHoursForDay(teacherId: string, day: number): number {
    return this.generatedSlots
      .filter(slot => 
        slot.day === day && 
        slot.teacherId === teacherId && 
        slot.subjectId
      )
      .reduce((total, slot) => total + (slot.duration / 60), 0);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private generateStatistics() {
    const totalSlots = this.generatedSlots.length;
    const scheduledSlots = this.generatedSlots.filter(s => s.subjectId || s.isSpecialClass).length;
    const utilization = totalSlots > 0 ? (scheduledSlots / totalSlots) * 100 : 0;

    return {
      totalSlots,
      scheduledSlots,
      utilization: Math.round(utilization * 100) / 100,
      conflicts: this.conflicts.length,
      subjects: this.subjects.length,
      teachers: new Set(this.generatedSlots.map(s => s.teacherId).filter(Boolean)).size,
      classrooms: new Set(this.generatedSlots.map(s => s.classroomId).filter(Boolean)).size
    };
  }
}