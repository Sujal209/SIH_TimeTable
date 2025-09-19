import { 
  Teacher, 
  Subject, 
  Classroom, 
  TimeSlot, 
  TimetableEntry, 
  TimetableConstraints,
  GenerationConfig,
  ConflictReport,
  TeacherConflict,
  ClassroomConflict,
  ConstraintViolation,
  DayOfWeek 
} from '../../types';

export class TimetableGenerator {
  private config: GenerationConfig;
  private timetableEntries: TimetableEntry[] = [];
  private conflicts: ConflictReport = {
    teacher_conflicts: [],
    classroom_conflicts: [],
    constraint_violations: []
  };

  constructor(config: GenerationConfig) {
    this.config = config;
  }

  /**
   * Main method to generate a complete timetable
   */
  async generateTimetable(): Promise<{ entries: TimetableEntry[]; conflicts: ConflictReport }> {
    try {
      console.log('Starting timetable generation...');
      
      // Reset state
      this.timetableEntries = [];
      this.conflicts = {
        teacher_conflicts: [],
        classroom_conflicts: [],
        constraint_violations: []
      };

      // Step 1: Validate input data
      this.validateInputData();

      // Step 2: Process subjects and calculate required slots
      const subjectSlots = this.calculateSubjectSlots();

      // Step 3: Group time slots by day
      const timeSlotsByDay = this.groupTimeSlotsByDay();

      // Step 4: Generate assignments using constraint solving
      await this.generateAssignments(subjectSlots, timeSlotsByDay);

      // Step 5: Validate and fix conflicts
      this.validateAndFixConflicts();

      console.log(`Generated ${this.timetableEntries.length} timetable entries`);
      
      return {
        entries: this.timetableEntries,
        conflicts: this.conflicts
      };
    } catch (error) {
      console.error('Timetable generation failed:', error);
      throw error;
    }
  }

  private validateInputData(): void {
    const { teachers, subjects, classrooms, time_slots } = this.config;

    if (!teachers.length) throw new Error('No teachers available');
    if (!subjects.length) throw new Error('No subjects to schedule');
    if (!classrooms.length) throw new Error('No classrooms available');
    if (!time_slots.length) throw new Error('No time slots defined');

    // Check if teachers are assigned to subjects
    const unassignedSubjects = subjects.filter(s => !s.teacher_id);
    if (unassignedSubjects.length > 0) {
      throw new Error(`${unassignedSubjects.length} subjects have no assigned teacher`);
    }
  }

  private calculateSubjectSlots(): Array<{
    subject: Subject;
    teacher: Teacher;
    requiredSlots: number;
    isLab: boolean;
  }> {
    const subjectSlots: Array<{
      subject: Subject;
      teacher: Teacher;
      requiredSlots: number;
      isLab: boolean;
    }> = [];

    for (const subject of this.config.subjects) {
      const teacher = this.config.teachers.find(t => t.id === subject.teacher_id);
      if (!teacher) continue;

      // Regular theory classes
      if (subject.hours_per_week > 0) {
        subjectSlots.push({
          subject,
          teacher,
          requiredSlots: subject.hours_per_week,
          isLab: false
        });
      }

      // Lab sessions (each lab = 2 consecutive slots)
      if (subject.lab_hours_per_week > 0) {
        const labSessions = Math.ceil(subject.lab_hours_per_week / 2);
        subjectSlots.push({
          subject,
          teacher,
          requiredSlots: labSessions,
          isLab: true
        });
      }
    }

    return subjectSlots;
  }

  private groupTimeSlotsByDay(): Record<DayOfWeek, TimeSlot[]> {
    const grouped: Record<DayOfWeek, TimeSlot[]> = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: []
    };

    this.config.time_slots
      .filter(slot => !slot.is_break)
      .forEach(slot => {
        grouped[slot.day].push(slot);
      });

    // Sort by start time
    Object.keys(grouped).forEach(day => {
      grouped[day as DayOfWeek].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    return grouped;
  }

  private async generateAssignments(
    subjectSlots: Array<{
      subject: Subject;
      teacher: Teacher;
      requiredSlots: number;
      isLab: boolean;
    }>,
    timeSlotsByDay: Record<DayOfWeek, TimeSlot[]>
  ): Promise<void> {
    // Sort subjects by priority (labs first, then by hours per week descending)
    subjectSlots.sort((a, b) => {
      if (a.isLab && !b.isLab) return -1;
      if (!a.isLab && b.isLab) return 1;
      return b.requiredSlots - a.requiredSlots;
    });

    for (const subjectSlot of subjectSlots) {
      await this.scheduleSubject(subjectSlot, timeSlotsByDay);
    }
  }

  private async scheduleSubject(
    subjectSlot: {
      subject: Subject;
      teacher: Teacher;
      requiredSlots: number;
      isLab: boolean;
    },
    timeSlotsByDay: Record<DayOfWeek, TimeSlot[]>
  ): Promise<void> {
    const { subject, teacher, requiredSlots, isLab } = subjectSlot;
    let scheduledSlots = 0;

    const workingDays = this.config.constraints.working_days;
    const shuffledDays = this.shuffleArray([...workingDays]);

    for (const day of shuffledDays) {
      if (scheduledSlots >= requiredSlots) break;

      const daySlots = timeSlotsByDay[day];
      if (!daySlots.length) continue;

      if (isLab) {
        // Schedule lab sessions (need consecutive slots)
        const labsNeeded = requiredSlots - scheduledSlots;
        const scheduled = await this.scheduleLabSession(
          subject, teacher, day, daySlots, labsNeeded
        );
        scheduledSlots += scheduled;
      } else {
        // Schedule regular theory classes
        const slotsNeeded = requiredSlots - scheduledSlots;
        const scheduled = await this.scheduleTheoryClasses(
          subject, teacher, day, daySlots, slotsNeeded
        );
        scheduledSlots += scheduled;
      }
    }

    // Report if we couldn't schedule all required slots
    if (scheduledSlots < requiredSlots) {
      this.conflicts.constraint_violations.push({
        type: 'max_hours',
        teacher_id: teacher.id,
        message: `Could only schedule ${scheduledSlots}/${requiredSlots} slots for ${subject.name}`,
        severity: 'warning'
      });
    }
  }

  private async scheduleLabSession(
    subject: Subject,
    teacher: Teacher,
    day: DayOfWeek,
    daySlots: TimeSlot[],
    labsNeeded: number
  ): Promise<number> {
    let scheduledLabs = 0;

    for (let i = 0; i < daySlots.length - 1 && scheduledLabs < labsNeeded; i++) {
      const slot1 = daySlots[i];
      const slot2 = daySlots[i + 1];

      // Check if these are consecutive slots
      if (!this.areConsecutiveSlots(slot1, slot2)) continue;

      // Find suitable lab classroom
      const classroom = this.findBestClassroom(subject, 'lab', day, [slot1, slot2]);
      if (!classroom) continue;

      // Check if teacher and classroom are available
      if (!this.isTeacherAvailable(teacher, day, [slot1, slot2]) ||
          !this.isClassroomAvailable(classroom, day, [slot1, slot2])) {
        continue;
      }

      // Create lab session entries (2 consecutive slots)
      const entryId1 = this.generateId();
      const entryId2 = this.generateId();

      this.timetableEntries.push({
        id: entryId1,
        timetable_id: '',
        subject_id: subject.id,
        teacher_id: teacher.id,
        classroom_id: classroom.id,
        time_slot_id: slot1.id,
        day: day,
        is_lab: true,
        consecutive_slots: 2,
        subject,
        teacher,
        classroom,
        time_slot: slot1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      this.timetableEntries.push({
        id: entryId2,
        timetable_id: '',
        subject_id: subject.id,
        teacher_id: teacher.id,
        classroom_id: classroom.id,
        time_slot_id: slot2.id,
        day: day,
        is_lab: true,
        consecutive_slots: 2,
        subject,
        teacher,
        classroom,
        time_slot: slot2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      scheduledLabs++;
      i++; // Skip next slot as it's already used
    }

    return scheduledLabs;
  }

  private async scheduleTheoryClasses(
    subject: Subject,
    teacher: Teacher,
    day: DayOfWeek,
    daySlots: TimeSlot[],
    slotsNeeded: number
  ): Promise<number> {
    let scheduledSlots = 0;

    for (const slot of daySlots) {
      if (scheduledSlots >= slotsNeeded) break;

      // Find suitable lecture classroom
      const classroom = this.findBestClassroom(subject, 'lecture', day, [slot]);
      if (!classroom) continue;

      // Check availability
      if (!this.isTeacherAvailable(teacher, day, [slot]) ||
          !this.isClassroomAvailable(classroom, day, [slot])) {
        continue;
      }

      // Check teacher's daily hour limit
      const teacherDailyHours = this.getTeacherDailyHours(teacher, day);
      if (teacherDailyHours >= teacher.max_hours_per_day) {
        continue;
      }

      // Create timetable entry
      this.timetableEntries.push({
        id: this.generateId(),
        timetable_id: '',
        subject_id: subject.id,
        teacher_id: teacher.id,
        classroom_id: classroom.id,
        time_slot_id: slot.id,
        day: day,
        is_lab: false,
        consecutive_slots: 1,
        subject,
        teacher,
        classroom,
        time_slot: slot,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      scheduledSlots++;
    }

    return scheduledSlots;
  }

  private findBestClassroom(
    subject: Subject,
    type: 'lecture' | 'lab' | 'seminar',
    day: DayOfWeek,
    slots: TimeSlot[]
  ): Classroom | null {
    const suitableClassrooms = this.config.classrooms
      .filter(classroom => 
        classroom.type === type && 
        classroom.department === subject.department
      )
      .sort((a, b) => a.capacity - b.capacity); // Prefer smaller classrooms first

    for (const classroom of suitableClassrooms) {
      if (this.isClassroomAvailable(classroom, day, slots)) {
        return classroom;
      }
    }

    // If no department-specific classroom is available, try any classroom of the right type
    const anyClassrooms = this.config.classrooms
      .filter(classroom => classroom.type === type)
      .sort((a, b) => a.capacity - b.capacity);

    for (const classroom of anyClassrooms) {
      if (this.isClassroomAvailable(classroom, day, slots)) {
        return classroom;
      }
    }

    return null;
  }

  private isTeacherAvailable(teacher: Teacher, day: DayOfWeek, slots: TimeSlot[]): boolean {
    // Check if teacher has any unavailable slots
    for (const slot of slots) {
      if (teacher.unavailable_slots.includes(slot.id)) {
        return false;
      }
    }

    // Check if teacher is already scheduled during these slots
    for (const slot of slots) {
      const conflict = this.timetableEntries.find(entry =>
        entry.teacher_id === teacher.id &&
        entry.day === day &&
        entry.time_slot_id === slot.id
      );
      if (conflict) return false;
    }

    return true;
  }

  private isClassroomAvailable(classroom: Classroom, day: DayOfWeek, slots: TimeSlot[]): boolean {
    for (const slot of slots) {
      const conflict = this.timetableEntries.find(entry =>
        entry.classroom_id === classroom.id &&
        entry.day === day &&
        entry.time_slot_id === slot.id
      );
      if (conflict) return false;
    }
    return true;
  }

  private areConsecutiveSlots(slot1: TimeSlot, slot2: TimeSlot): boolean {
    // Simple check if end time of slot1 matches start time of slot2
    return slot1.end_time === slot2.start_time;
  }

  private getTeacherDailyHours(teacher: Teacher, day: DayOfWeek): number {
    return this.timetableEntries
      .filter(entry => entry.teacher_id === teacher.id && entry.day === day)
      .reduce((total, entry) => total + (entry.time_slot?.duration || 0), 0) / 60; // Convert minutes to hours
  }

  private validateAndFixConflicts(): void {
    // Check for teacher conflicts
    this.checkTeacherConflicts();
    
    // Check for classroom conflicts
    this.checkClassroomConflicts();
    
    // Check constraint violations
    this.checkConstraintViolations();
  }

  private checkTeacherConflicts(): void {
    const teacherSchedules: Record<string, Record<string, Record<string, TimetableEntry[]>>> = {};

    // Group entries by teacher, day, and time slot
    this.timetableEntries.forEach(entry => {
      if (!teacherSchedules[entry.teacher_id]) {
        teacherSchedules[entry.teacher_id] = {};
      }
      if (!teacherSchedules[entry.teacher_id][entry.day]) {
        teacherSchedules[entry.teacher_id][entry.day] = {};
      }
      if (!teacherSchedules[entry.teacher_id][entry.day][entry.time_slot_id]) {
        teacherSchedules[entry.teacher_id][entry.day][entry.time_slot_id] = [];
      }
      teacherSchedules[entry.teacher_id][entry.day][entry.time_slot_id].push(entry);
    });

    // Find conflicts (multiple entries in same slot)
    Object.entries(teacherSchedules).forEach(([teacherId, days]) => {
      const teacher = this.config.teachers.find(t => t.id === teacherId);
      if (!teacher) return;

      const conflicts: TeacherConflict['conflicts'] = [];

      Object.entries(days).forEach(([day, slots]) => {
        Object.entries(slots).forEach(([slotId, entries]) => {
          if (entries.length > 1) {
            const timeSlot = entries[0].time_slot;
            conflicts.push({
              day: day as DayOfWeek,
              time_slot: `${timeSlot?.start_time} - ${timeSlot?.end_time}`,
              subjects: entries.map(e => e.subject?.name || 'Unknown')
            });
          }
        });
      });

      if (conflicts.length > 0) {
        this.conflicts.teacher_conflicts.push({
          teacher_id: teacherId,
          teacher_name: teacher.name,
          conflicts
        });
      }
    });
  }

  private checkClassroomConflicts(): void {
    // Similar logic to teacher conflicts but for classrooms
    const classroomSchedules: Record<string, Record<string, Record<string, TimetableEntry[]>>> = {};

    this.timetableEntries.forEach(entry => {
      if (!classroomSchedules[entry.classroom_id]) {
        classroomSchedules[entry.classroom_id] = {};
      }
      if (!classroomSchedules[entry.classroom_id][entry.day]) {
        classroomSchedules[entry.classroom_id][entry.day] = {};
      }
      if (!classroomSchedules[entry.classroom_id][entry.day][entry.time_slot_id]) {
        classroomSchedules[entry.classroom_id][entry.day][entry.time_slot_id] = [];
      }
      classroomSchedules[entry.classroom_id][entry.day][entry.time_slot_id].push(entry);
    });

    Object.entries(classroomSchedules).forEach(([classroomId, days]) => {
      const classroom = this.config.classrooms.find(c => c.id === classroomId);
      if (!classroom) return;

      const conflicts: ClassroomConflict['conflicts'] = [];

      Object.entries(days).forEach(([day, slots]) => {
        Object.entries(slots).forEach(([slotId, entries]) => {
          if (entries.length > 1) {
            const timeSlot = entries[0].time_slot;
            conflicts.push({
              day: day as DayOfWeek,
              time_slot: `${timeSlot?.start_time} - ${timeSlot?.end_time}`,
              subjects: entries.map(e => e.subject?.name || 'Unknown')
            });
          }
        });
      });

      if (conflicts.length > 0) {
        this.conflicts.classroom_conflicts.push({
          classroom_id: classroomId,
          classroom_name: classroom.name,
          conflicts
        });
      }
    });
  }

  private checkConstraintViolations(): void {
    // Check teacher daily hour limits
    this.config.teachers.forEach(teacher => {
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].forEach(day => {
        const dailyHours = this.getTeacherDailyHours(teacher, day as DayOfWeek);
        if (dailyHours > teacher.max_hours_per_day) {
          this.conflicts.constraint_violations.push({
            type: 'max_hours',
            teacher_id: teacher.id,
            message: `${teacher.name} scheduled for ${dailyHours} hours on ${day} (max: ${teacher.max_hours_per_day})`,
            severity: 'error'
          });
        }
      });
    });
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private generateId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get generation statistics
   */
  getStatistics(): {
    totalEntries: number;
    entriesByDay: Record<DayOfWeek, number>;
    teacherUtilization: Record<string, number>;
    classroomUtilization: Record<string, number>;
  } {
    const entriesByDay: Record<DayOfWeek, number> = {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0
    };

    const teacherUtilization: Record<string, number> = {};
    const classroomUtilization: Record<string, number> = {};

    this.timetableEntries.forEach(entry => {
      entriesByDay[entry.day]++;
      teacherUtilization[entry.teacher_id] = (teacherUtilization[entry.teacher_id] || 0) + 1;
      classroomUtilization[entry.classroom_id] = (classroomUtilization[entry.classroom_id] || 0) + 1;
    });

    return {
      totalEntries: this.timetableEntries.length,
      entriesByDay,
      teacherUtilization,
      classroomUtilization
    };
  }
}