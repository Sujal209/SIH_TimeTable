-- SIH Smart Timetable Generator - Extended Database Schema
-- This extends the existing database with new tables for optimization and management

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. BATCHES/STUDENT GROUPS MANAGEMENT
-- ============================================================================

-- Student batches/groups table
CREATE TABLE public.batches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- e.g., "CSE-A-2024", "ECE-B-2023"
    department VARCHAR(100) NOT NULL,
    program_type VARCHAR(20) NOT NULL CHECK (program_type IN ('UG', 'PG', 'PhD')),
    year INTEGER NOT NULL CHECK (year >= 1 AND year <= 6),
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 12),
    strength INTEGER NOT NULL DEFAULT 0 CHECK (strength >= 0),
    shift_type VARCHAR(20) DEFAULT 'morning' CHECK (shift_type IN ('morning', 'evening', 'full_day')),
    academic_year VARCHAR(20) NOT NULL, -- e.g., "2024-25"
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique batch per department/year/semester/shift
    CONSTRAINT unique_batch_identifier UNIQUE (department, program_type, year, semester, shift_type, academic_year)
);

-- Batch-Subject mapping (many-to-many relationship)
CREATE TABLE public.batch_subjects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    is_elective BOOLEAN DEFAULT false,
    is_mandatory BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1, -- For elective selection priority
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate batch-subject mappings
    CONSTRAINT unique_batch_subject UNIQUE (batch_id, subject_id)
);

-- ============================================================================
-- 2. FACULTY AVAILABILITY & LEAVE MANAGEMENT  
-- ============================================================================

-- Faculty availability preferences
CREATE TABLE public.faculty_availability (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    shift_type VARCHAR(20) DEFAULT 'morning' CHECK (shift_type IN ('morning', 'evening', 'full_day')),
    preference_level INTEGER DEFAULT 1 CHECK (preference_level >= 1 AND preference_level <= 5), -- 1=most preferred, 5=least
    is_available BOOLEAN DEFAULT true,
    academic_year VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure start_time < end_time
    CONSTRAINT valid_time_range CHECK (start_time < end_time),
    -- Prevent overlapping availability slots for same teacher/day/shift
    CONSTRAINT unique_availability_slot UNIQUE (teacher_id, day_of_week, start_time, end_time, shift_type, academic_year)
);

-- Faculty leaves and unavailability
CREATE TABLE public.faculty_leaves (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL, -- 'sick', 'casual', 'official', 'maternity', 'conference'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    is_recurring BOOLEAN DEFAULT false, -- For weekly recurring leaves
    recurring_day INTEGER, -- Day of week if recurring (0-6)
    recurring_start_time TIME, -- Start time if recurring
    recurring_end_time TIME, -- End time if recurring
    status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by TEXT REFERENCES public.users(id),
    academic_year VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure valid date range
    CONSTRAINT valid_leave_dates CHECK (start_date <= end_date),
    -- Ensure recurring time range is valid
    CONSTRAINT valid_recurring_times CHECK (
        (is_recurring = false) OR 
        (is_recurring = true AND recurring_start_time < recurring_end_time AND recurring_day IS NOT NULL)
    )
);

-- ============================================================================
-- 3. SPECIAL CLASSES & FIXED SLOTS
-- ============================================================================

-- Special classes that have fixed time slots (cannot be moved during optimization)
CREATE TABLE public.special_classes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(200) NOT NULL, -- e.g., "Database Lab Session", "Guest Lecture by Dr. Smith"
    class_type VARCHAR(50) NOT NULL, -- 'lab', 'seminar', 'guest_lecture', 'exam', 'workshop'
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL, -- Optional link to subject
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL, -- Optional link to teacher
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE RESTRICT,
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE, -- Which batch this is for
    
    -- Fixed time slot details
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (end_time - start_time))/60) STORED,
    
    -- Recurrence settings
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(20) DEFAULT 'weekly' CHECK (recurrence_pattern IN ('weekly', 'biweekly', 'monthly', 'once')),
    start_date DATE NOT NULL,
    end_date DATE, -- NULL for indefinite recurring classes
    
    -- Requirements and constraints
    required_equipment TEXT[], -- Array of required equipment
    special_requirements TEXT,
    max_students INTEGER,
    is_mandatory BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1, -- Higher priority = harder to move/cancel
    
    -- Metadata
    shift_type VARCHAR(20) DEFAULT 'morning' CHECK (shift_type IN ('morning', 'evening', 'full_day')),
    academic_year VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
    notes TEXT,
  created_by TEXT REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure valid time range
    CONSTRAINT valid_special_class_time CHECK (start_time < end_time),
    -- Ensure valid date range if end_date specified
    CONSTRAINT valid_special_class_dates CHECK (end_date IS NULL OR start_date <= end_date)
);

-- ============================================================================
-- 4. TIMETABLE GENERATION & OPTIMIZATION TRACKING
-- ============================================================================

-- Track timetable generation attempts and results
CREATE TABLE public.timetable_generations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(200) NOT NULL, -- User-friendly name for this generation
    department VARCHAR(100), -- NULL for multi-department generations
    academic_year VARCHAR(20) NOT NULL,
    semester INTEGER CHECK (semester >= 1 AND semester <= 12),
    
    -- Generation parameters
    algorithm_type VARCHAR(50) NOT NULL DEFAULT 'csp' CHECK (algorithm_type IN ('csp', 'genetic', 'hybrid')),
    optimization_goals JSONB, -- Store optimization priorities as JSON
    constraints_config JSONB, -- Store constraint configurations
    
    -- Generation status and results
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    -- Optimization metrics
    total_classes_scheduled INTEGER DEFAULT 0,
    conflicts_resolved INTEGER DEFAULT 0,
    classroom_utilization_percent DECIMAL(5,2), -- e.g., 87.50%
    faculty_workload_balance_score DECIMAL(5,2), -- Custom metric for workload distribution
    constraint_satisfaction_score DECIMAL(5,2), -- Percentage of constraints satisfied
    
    -- Generation timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    processing_time_seconds INTEGER, -- Total time taken for optimization
    
    -- Results and options
    options_generated INTEGER DEFAULT 0, -- Number of timetable options generated (2-3 typically)
    selected_option INTEGER, -- Which option was selected by admin (1, 2, or 3)
    
    -- Workflow states
    timetable_status VARCHAR(20) DEFAULT 'draft' CHECK (timetable_status IN ('draft', 'generated', 'reviewed', 'approved', 'published', 'archived')),
  approved_by TEXT REFERENCES public.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Error handling
    error_message TEXT,
    debug_info JSONB, -- Store debugging information for failed generations
    
    -- Metadata
  created_by TEXT NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store multiple timetable options generated for each generation
CREATE TABLE public.timetable_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    generation_id UUID NOT NULL REFERENCES public.timetable_generations(id) ON DELETE CASCADE,
    option_number INTEGER NOT NULL CHECK (option_number >= 1 AND option_number <= 5),
    
    -- Optimization metrics for this specific option
    classroom_utilization_percent DECIMAL(5,2),
    faculty_workload_balance_score DECIMAL(5,2),
    total_conflicts INTEGER DEFAULT 0,
    total_unscheduled_classes INTEGER DEFAULT 0,
    optimization_score DECIMAL(8,4), -- Overall score for this option
    
    -- Option metadata
    algorithm_parameters JSONB, -- Parameters used to generate this option
    generation_notes TEXT,
    is_selected BOOLEAN DEFAULT false, -- Which option was selected
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique option numbers per generation
    CONSTRAINT unique_option_per_generation UNIQUE (generation_id, option_number)
);

-- ============================================================================
-- 5. ENHANCED SHIFTS & MULTI-DEPARTMENT SUPPORT
-- ============================================================================

-- Define institutional shifts
CREATE TABLE public.shifts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(50) NOT NULL, -- e.g., "Morning Shift", "Evening Shift"
    code VARCHAR(10) NOT NULL UNIQUE, -- e.g., "M", "E", "FD"
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    departments TEXT[] DEFAULT '{}', -- Array of departments using this shift
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure valid time range
    CONSTRAINT valid_shift_times CHECK (start_time < end_time)
);

-- Department shift assignments
CREATE TABLE public.department_shifts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    department VARCHAR(100) NOT NULL,
    shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
    academic_year VARCHAR(20) NOT NULL,
    is_primary BOOLEAN DEFAULT false, -- Is this the primary shift for the department?
    max_batches INTEGER DEFAULT 10, -- Max batches that can be scheduled in this shift
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate department-shift assignments per academic year
    CONSTRAINT unique_dept_shift_year UNIQUE (department, shift_id, academic_year)
);

-- ============================================================================
-- 6. OPTIMIZATION CONSTRAINTS & PREFERENCES
-- ============================================================================

-- Store optimization constraints and preferences
CREATE TABLE public.optimization_constraints (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- e.g., "CSE Department Constraints 2024-25"
    department VARCHAR(100),
    academic_year VARCHAR(20) NOT NULL,
    
    -- Constraint settings (stored as JSONB for flexibility)
    constraints JSONB NOT NULL, -- All constraint parameters
    /* Example structure:
    {
        "classroom_utilization_target": 85,
        "max_consecutive_hours_per_teacher": 4,
        "max_daily_hours_per_teacher": 8,
        "preferred_break_duration_minutes": 15,
        "avoid_first_last_hour_preferences": ["teacher_id_1", "teacher_id_2"],
        "lab_session_min_duration_minutes": 120,
        "max_students_per_classroom_ratio": 1.1
    }
    */
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false, -- Is this the default constraint set?
  created_by TEXT NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 7. UPDATE EXISTING TABLES WITH SIH ENHANCEMENTS
-- ============================================================================

-- Add new columns to existing teachers table
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS max_daily_hours INTEGER DEFAULT 8;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS max_consecutive_hours INTEGER DEFAULT 4;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS preferred_shifts TEXT[] DEFAULT '{"morning"}';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS leave_balance_days INTEGER DEFAULT 30;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS avg_leaves_per_month DECIMAL(3,1) DEFAULT 1.0;

-- Add new columns to existing subjects table  
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 3;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS subject_type VARCHAR(20) DEFAULT 'theory' CHECK (subject_type IN ('theory', 'lab', 'tutorial', 'seminar'));
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS min_students_required INTEGER DEFAULT 1;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS max_students_allowed INTEGER DEFAULT 60;

-- Add new columns to existing classrooms table
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS building VARCHAR(100);
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS floor INTEGER DEFAULT 1;
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS is_lab BOOLEAN DEFAULT false;
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS shift_availability TEXT[] DEFAULT '{"morning", "evening"}';
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS maintenance_hours TEXT[]; -- Hours when room is unavailable

-- Add new columns to existing time_slots table
ALTER TABLE public.time_slots ADD COLUMN IF NOT EXISTS shift_type VARCHAR(20) DEFAULT 'morning';
ALTER TABLE public.time_slots ADD COLUMN IF NOT EXISTS is_fixed_slot BOOLEAN DEFAULT false;
ALTER TABLE public.time_slots ADD COLUMN IF NOT EXISTS slot_type VARCHAR(20) DEFAULT 'class' CHECK (slot_type IN ('class', 'break', 'lab', 'lunch'));

-- ============================================================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Batches indexes
CREATE INDEX idx_batches_department_year ON public.batches(department, academic_year);
CREATE INDEX idx_batches_active ON public.batches(is_active) WHERE is_active = true;
CREATE INDEX idx_batch_subjects_batch ON public.batch_subjects(batch_id);
CREATE INDEX idx_batch_subjects_subject ON public.batch_subjects(subject_id);

-- Faculty availability indexes
CREATE INDEX idx_faculty_availability_teacher ON public.faculty_availability(teacher_id);
CREATE INDEX idx_faculty_availability_day_time ON public.faculty_availability(day_of_week, start_time, end_time);
CREATE INDEX idx_faculty_leaves_teacher_dates ON public.faculty_leaves(teacher_id, start_date, end_date);
CREATE INDEX idx_faculty_leaves_active ON public.faculty_leaves(status) WHERE status = 'approved';

-- Special classes indexes
CREATE INDEX idx_special_classes_day_time ON public.special_classes(day_of_week, start_time);
CREATE INDEX idx_special_classes_classroom ON public.special_classes(classroom_id);
CREATE INDEX idx_special_classes_batch ON public.special_classes(batch_id);
CREATE INDEX idx_special_classes_active ON public.special_classes(status) WHERE status = 'active';

-- Generation tracking indexes
CREATE INDEX idx_timetable_generations_status ON public.timetable_generations(status);
CREATE INDEX idx_timetable_generations_dept_year ON public.timetable_generations(department, academic_year);
CREATE INDEX idx_timetable_generations_created_by ON public.timetable_generations(created_by);
CREATE INDEX idx_timetable_options_generation ON public.timetable_options(generation_id);

-- Shifts indexes
CREATE INDEX idx_department_shifts_dept ON public.department_shifts(department);
CREATE INDEX idx_department_shifts_shift ON public.department_shifts(shift_id);

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_constraints ENABLE ROW LEVEL SECURITY;

-- Batches policies
CREATE POLICY "Allow authenticated users to read batches" ON public.batches
    FOR SELECT USING (auth.role() = 'authenticated');
    
CREATE POLICY "Allow admins to manage batches" ON public.batches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Faculty availability policies
CREATE POLICY "Teachers can manage their own availability" ON public.faculty_availability
    FOR ALL USING (
        teacher_id IN (
            SELECT id FROM public.teachers WHERE user_id = auth.uid()::text
        )
    );

CREATE POLICY "Admins can view all availability" ON public.faculty_availability
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Faculty leaves policies
CREATE POLICY "Teachers can manage their own leaves" ON public.faculty_leaves
    FOR ALL USING (
        teacher_id IN (
            SELECT id FROM public.teachers WHERE user_id = auth.uid()::text
        )
    );

CREATE POLICY "Admins can manage all leaves" ON public.faculty_leaves
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Special classes policies
CREATE POLICY "Allow authenticated users to read special classes" ON public.special_classes
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to manage special classes" ON public.special_classes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Timetable generation policies
CREATE POLICY "Allow authenticated users to read generations" ON public.timetable_generations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to manage generations" ON public.timetable_generations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Shifts policies  
CREATE POLICY "Allow authenticated users to read shifts" ON public.shifts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to manage shifts" ON public.shifts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Batch subjects policies
CREATE POLICY "Allow authenticated users to read batch subjects" ON public.batch_subjects
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to manage batch subjects" ON public.batch_subjects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Timetable options policies
CREATE POLICY "Allow authenticated users to read timetable options" ON public.timetable_options
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to manage timetable options" ON public.timetable_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Department shifts policies
CREATE POLICY "Allow authenticated users to read department shifts" ON public.department_shifts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to manage department shifts" ON public.department_shifts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Optimization constraints policies
CREATE POLICY "Allow authenticated users to read optimization constraints" ON public.optimization_constraints
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to manage optimization constraints" ON public.optimization_constraints
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- ============================================================================
-- 10. TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

-- Update triggers for all new tables
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON public.batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faculty_availability_updated_at BEFORE UPDATE ON public.faculty_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faculty_leaves_updated_at BEFORE UPDATE ON public.faculty_leaves
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_special_classes_updated_at BEFORE UPDATE ON public.special_classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timetable_generations_updated_at BEFORE UPDATE ON public.timetable_generations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON public.shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_optimization_constraints_updated_at BEFORE UPDATE ON public.optimization_constraints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 11. INSERT SAMPLE DATA FOR DEVELOPMENT
-- ============================================================================

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;