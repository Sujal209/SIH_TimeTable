export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher';
  department?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  id: string;
  user_id: string;
  name: string;
  email: string;
  department: string;
  phone?: string;
  max_hours_per_day: number;
  unavailable_slots: TimeSlot[];
  preferences: TeacherPreferences;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  department: string;
  semester: number;
  hours_per_week: number;
  lab_hours_per_week: number;
  teacher_id: string;
  teacher?: Teacher;
  created_at: string;
  updated_at: string;
}

export interface Classroom {
  id: string;
  name: string;
  capacity: number;
  type: 'lecture' | 'lab' | 'seminar';
  department: string;
  equipment: string[];
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  id: string;
  day?: DayOfWeek;
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  duration: number; // in minutes
  is_break: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TimetableAssignment {
  id: string;
  subject_id: string;
  teacher_id: string;
  classroom_id: string;
  time_slot_id: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, etc.
  week_number: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TimetableView {
  id: string;
  day_of_week: number;
  week_number: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Subject details
  subject_id: string;
  subject_name: string;
  subject_code: string;
  subject_department: string;
  subject_credits: number;
  subject_type: string;
  subject_color: string;
  // Teacher details
  teacher_id: string;
  teacher_name: string;
  teacher_email: string;
  teacher_phone?: string;
  teacher_department: string;
  // Classroom details
  classroom_id: string;
  classroom_name: string;
  classroom_building: string;
  classroom_floor: number;
  classroom_capacity: number;
  classroom_type: string;
  classroom_equipment: string[];
  // Time slot details
  time_slot_id: string;
  start_time: string;
  end_time: string;
  duration: number;
  is_break: boolean;
}

export interface TimetableEntryOld {
  id: string;
  timetable_id: string;
  subject_id: string;
  teacher_id: string;
  classroom_id: string;
  time_slot_id: string;
  day_of_week: number;
  week_number?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Timetable {
  id: string;
  name: string;
  department: string;
  semester: number;
  academic_year: string;
  is_active: boolean;
  entries: TimetableEntry[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeacherPreferences {
  preferred_time_slots: string[]; // time slot IDs
  max_consecutive_hours: number;
  preferred_days: DayOfWeek[];
  break_duration: number; // in minutes
}

export interface TimetableConstraints {
  max_hours_per_day: number;
  max_consecutive_hours: number;
  break_after_hours: number;
  break_duration: number;
  lab_session_duration: number; // in slots (usually 2)
  working_days: DayOfWeek[];
}

export interface GenerationConfig {
  department: string;
  semester: number;
  academic_year: string;
  constraints: TimetableConstraints;
  teachers: Teacher[];
  subjects: Subject[];
  classrooms: Classroom[];
  time_slots: TimeSlot[];
}

export interface ConflictReport {
  teacher_conflicts: TeacherConflict[];
  classroom_conflicts: ClassroomConflict[];
  constraint_violations: ConstraintViolation[];
}

export interface TeacherConflict {
  teacher_id: string;
  teacher_name: string;
  conflicts: {
    day: DayOfWeek;
    time_slot: string;
    subjects: string[];
  }[];
}

export interface ClassroomConflict {
  classroom_id: string;
  classroom_name: string;
  conflicts: {
    day: DayOfWeek;
    time_slot: string;
    subjects: string[];
  }[];
}

export interface ConstraintViolation {
  type: 'max_hours' | 'consecutive_hours' | 'break_duration' | 'unavailable_slot';
  teacher_id?: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface WhatsAppMessage {
  to: string;
  type: 'document' | 'image';
  document?: {
    link: string;
    filename: string;
  };
  image?: {
    link: string;
  };
}

export interface ExportOptions {
  format: 'pdf' | 'png';
  orientation: 'portrait' | 'landscape';
  include_teacher_details: boolean;
  include_room_details: boolean;
  title?: string;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

// Day constants matching database values
export const DAYS_OF_WEEK = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export type UserRole = 'admin' | 'teacher';

// Timetable generation and approval status types
export type TimetableStatus = 'draft' | 'generated' | 'reviewed' | 'approved' | 'published' | 'archived';
export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type ShiftType = 'morning' | 'evening' | 'full_day';
export type ProgramType = 'UG' | 'PG' | 'PhD';
export type SubjectType = 'theory' | 'lab' | 'tutorial' | 'seminar';
export type AlgorithmType = 'csp' | 'genetic' | 'hybrid';
export type LeaveType = 'sick' | 'casual' | 'official' | 'maternity' | 'conference';
export type SpecialClassType = 'lab' | 'seminar' | 'guest_lecture' | 'exam' | 'workshop';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type SpecialClassStatus = 'active' | 'cancelled' | 'completed';
export type RecurrencePattern = 'weekly' | 'biweekly' | 'monthly' | 'once';

// Additional types for Special Classes page
export type ClassType = 'lab' | 'seminar' | 'workshop' | 'guest_lecture' | 'exam';
export type Priority = 'high' | 'medium' | 'low';

export type ClassroomType = 'lecture' | 'lab' | 'seminar';

// ============================================================================
// SIH EXTENSION INTERFACES - Phase 2
// ============================================================================

// Batches/Student Groups interfaces
export interface Batch {
  id: string;
  name: string; // e.g., "CSE-A-2024", "ECE-B-2023"
  department: string;
  program_type: ProgramType;
  year: number; // 1-6
  semester: number; // 1-12
  strength: number;
  shift_type: ShiftType;
  academic_year: string; // e.g., "2024-25"
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BatchSubject {
  id: string;
  batch_id: string;
  subject_id: string;
  is_elective: boolean;
  is_mandatory: boolean;
  priority: number;
  created_at: string;
  // Populated fields
  subject?: Subject;
  batch?: Batch;
}

// Faculty availability and leaves interfaces
export interface FacultyAvailability {
  id: string;
  teacher_id: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string;
  end_time: string;
  shift_type: ShiftType;
  preference_level: number; // 1-5, 1=most preferred
  is_available: boolean;
  academic_year: string;
  created_at: string;
  updated_at: string;
  // Populated fields
  teacher?: Teacher;
}

export interface FacultyLeave {
  id: string;
  teacher_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason?: string;
  is_recurring: boolean;
  recurring_day?: number; // Day of week if recurring
  recurring_start_time?: string;
  recurring_end_time?: string;
  status: LeaveStatus;
  approved_by?: string;
  academic_year: string;
  created_at: string;
  updated_at: string;
  // Populated fields
  teacher?: Teacher;
  approver?: User;
}

// Special classes interface (matches actual database schema)
export interface SpecialClass {
  id: string;
  name: string;
  class_type: ClassType;
  subject_id?: string;
  teacher_id?: string;
  classroom_id: string;
  batch_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern;
  start_date: string;
  end_date?: string;
  required_equipment?: string[];
  special_requirements?: string;
  max_students?: number;
  is_mandatory: boolean;
  priority: number;
  shift_type: ShiftType;
  academic_year: string;
  status: SpecialClassStatus;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Populated fields
  subject?: Subject;
  teacher?: Teacher;
  classroom?: Classroom;
  batch?: Batch;
  creator?: User;
}

// Timetable generation and tracking interfaces
export interface TimetableGeneration {
  id: string;
  name: string;
  department?: string;
  academic_year: string;
  semester?: number;
  algorithm_type: AlgorithmType;
  optimization_goals?: Record<string, any>;
  constraints_config?: Record<string, any>;
  status: GenerationStatus;
  progress_percentage: number;
  total_classes_scheduled: number;
  conflicts_resolved: number;
  classroom_utilization_percent?: number;
  faculty_workload_balance_score?: number;
  constraint_satisfaction_score?: number;
  started_at?: string;
  completed_at?: string;
  processing_time_seconds?: number;
  options_generated: number;
  selected_option?: number;
  timetable_status: TimetableStatus;
  approved_by?: string;
  approved_at?: string;
  published_at?: string;
  error_message?: string;
  debug_info?: Record<string, any>;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Populated fields
  creator?: User;
  approver?: User;
  options?: TimetableOption[];
}

export interface TimetableOption {
  id: string;
  generation_id: string;
  option_number: number;
  classroom_utilization_percent?: number;
  faculty_workload_balance_score?: number;
  total_conflicts: number;
  total_unscheduled_classes: number;
  optimization_score?: number;
  algorithm_parameters?: Record<string, any>;
  generation_notes?: string;
  is_selected: boolean;
  created_at: string;
  // Populated fields
  generation?: TimetableGeneration;
}

// Shifts and department assignments
export interface Shift {
  id: string;
  name: string;
  code: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  departments: string[];
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface DepartmentShift {
  id: string;
  department: string;
  shift_id: string;
  academic_year: string;
  is_primary: boolean;
  max_batches: number;
  created_at: string;
  // Populated fields
  shift?: Shift;
}

// Optimization constraints
export interface OptimizationConstraints {
  id: string;
  name: string;
  department?: string;
  academic_year: string;
  constraints: Record<string, any>;
  is_active: boolean;
  is_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Populated fields
  creator?: User;
}

// Form types for React Hook Form
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  department?: string;
}

export interface TeacherFormData {
  name: string;
  email: string;
  department: string;
  phone?: string;
  max_hours_per_day: number;
}

export interface SubjectFormData {
  name: string;
  code: string;
  department: string;
  semester: number;
  hours_per_week: number;
  lab_hours_per_week: number;
  teacher_id: string;
}

export interface ClassroomFormData {
  name: string;
  capacity: number;
  type: ClassroomType;
  department: string;
  equipment: string[];
}

export interface TimeSlotFormData {
  day?: DayOfWeek;
  start_time: string;
  end_time: string;
  slot_type: 'class' | 'break' | 'lab';
}

export interface TimetableAssignmentFormData {
  subject_id: string;
  teacher_id: string;
  classroom_id: string;
  time_slot_id: string;
  day_of_week: number;
  notes?: string;
}

export interface CreateTimetableAssignmentData {
  subject_id: string;
  teacher_id: string;
  classroom_id: string;
  time_slot_id: string;
  day_of_week: number;
  week_number?: number;
  notes?: string;
}

export interface UpdateTimetableAssignmentData {
  subject_id?: string;
  teacher_id?: string;
  classroom_id?: string;
  time_slot_id?: string;
  day_of_week?: number;
  week_number?: number;
  notes?: string;
}

// ============================================================================
// SIH FORM DATA INTERFACES - Phase 2
// ============================================================================

// Batch form interfaces
export interface BatchFormData {
  name: string;
  department: string;
  program_type: ProgramType;
  year: number;
  semester: number;
  strength: number;
  shift_type: ShiftType;
  academic_year: string;
  notes?: string;
  subject_ids?: string[]; // For batch creation with initial subjects
}

export interface BatchSubjectFormData {
  batch_id: string;
  subject_id: string;
  is_elective: boolean;
  is_mandatory: boolean;
  priority: number;
}

// Faculty availability form interfaces
export interface FacultyAvailabilityFormData {
  teacher_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  shift_type: ShiftType;
  preference_level: number;
  is_available: boolean;
  academic_year: string;
}

export interface FacultyLeaveFormData {
  teacher_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason?: string;
  is_recurring: boolean;
  recurring_day?: number;
  recurring_start_time?: string;
  recurring_end_time?: string;
  academic_year: string;
}

// Special class form interfaces
export interface SpecialClassFormData {
  title: string; // Maps to 'name' in database
  description?: string; // Maps to 'special_requirements' in database
  class_type: ClassType;
  subject_id?: string;
  teacher_id?: string;
  classroom_id: string;
  batch_id?: string;
  date: string; // UI field - will be converted to day_of_week + start_date
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurring_pattern?: RecurrencePattern;
  recurring_end_date?: string; // Maps to 'end_date' in database
  required_equipment?: string[];
  special_requirements?: string;
  max_students?: number;
  is_mandatory?: boolean;
  priority: number;
  shift_type?: ShiftType;
  academic_year: string;
  notes?: string;
}

// Timetable generation form interfaces
export interface TimetableGenerationFormData {
  name: string;
  department?: string;
  academic_year: string;
  semester?: number;
  algorithm_type: AlgorithmType;
  optimization_goals?: Record<string, any>;
  constraints_config?: Record<string, any>;
}

// Shift management form interfaces
export interface ShiftFormData {
  name: string;
  code: string;
  start_time: string;
  end_time: string;
  departments: string[];
  description?: string;
}

export interface DepartmentShiftFormData {
  department: string;
  shift_id: string;
  academic_year: string;
  is_primary: boolean;
  max_batches: number;
}

// Optimization constraints form interfaces
export interface OptimizationConstraintsFormData {
  name: string;
  department?: string;
  academic_year: string;
  constraints: Record<string, any>;
  is_default: boolean;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Theme types
export interface ThemeContextType {
  isDark: boolean;
  toggle: () => void;
}

// Auth context types
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (userData: RegisterFormData) => Promise<void>;
  signOut: () => Promise<void>;
}

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

// ============================================================================
// TIMETABLE GENERATION SYSTEM TYPES
// ============================================================================

// Timetable Entry - Represents a scheduled period in the timetable
export interface TimetableEntry {
  id: string;
  batch_id: string;
  subject_id: string | null;
  teacher_id: string | null;
  classroom_id: string | null;
  time_slot_id: string;
  day_of_week: number; // 0-6 (Sunday to Saturday)
  academic_year: string;
  is_lab: boolean;
  is_break: boolean;
  is_lunch: boolean;
  special_class_id: string | null;
  duration_minutes: number;
  created_at: string;
  updated_at: string;
  
  // Joined data from related tables
  subject?: Subject;
  teacher?: Teacher;
  classroom?: Classroom;
  time_slot?: TimeSlot;
  batch?: Batch;
  special_class?: SpecialClass;
}

// Options for timetable generation
export interface TimetableGenerationOptions {
  academicYear: string;
  clearExisting?: boolean;
  maxTeacherHoursPerDay?: number;
  includeLunchBreak?: boolean;
  respectFacultyAvailability?: boolean;
  includeSpecialClasses?: boolean;
}

// Result of timetable generation
export interface TimetableGenerationResult {
  success: boolean;
  error?: string;
  timetableEntries?: TimetableEntry[];
  conflicts?: TimetableConflict[];
  statistics?: {
    totalSlots: number;
    scheduledSlots: number;
    utilization: number;
    conflicts: number;
    subjects: number;
    teachers: number;
    classrooms: number;
  };
  generatedAt: string;
  constraints?: any;
}

// Types of conflicts that can occur during generation
export type ConflictType = 
  | 'TEACHER_CONFLICT' 
  | 'CLASSROOM_CONFLICT' 
  | 'INSUFFICIENT_PERIODS' 
  | 'SPECIAL_CLASS_CONFLICT' 
  | 'TEACHER_OVERLOAD';

// Conflict information
export interface TimetableConflict {
  type: ConflictType;
  description: string;
  day?: number;
  timeSlot?: string;
  involvedEntities?: string[];
}

// View structure for timetable display
export interface TimetableView {
  batchId: string;
  academicYear: string;
  entries: TimetableEntry[];
  groupedByDay?: { [key: number]: TimetableEntry[] };
  statistics?: {
    totalEntries: number;
    subjectEntries: number;
    labEntries: number;
    breakEntries: number;
    lunchEntries: number;
    specialClassEntries: number;
    uniqueSubjects: number;
    uniqueTeachers: number;
    uniqueClassrooms: number;
    utilization: number;
  };
  generatedAt: string;
}