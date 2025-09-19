-- Timetable assignments schema
-- This table stores the actual timetable assignments linking subjects, teachers, classrooms, and time slots

-- Create timetable_assignments table
CREATE TABLE public.timetable_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    time_slot_id UUID NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 1 = Monday, etc.
    week_number INTEGER DEFAULT 1, -- For multi-week schedules (future feature)
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Ensure no double booking of classroom and time slot
    CONSTRAINT unique_classroom_timeslot UNIQUE (classroom_id, time_slot_id, day_of_week, week_number),
    -- Ensure teacher is not double booked
    CONSTRAINT unique_teacher_timeslot UNIQUE (teacher_id, time_slot_id, day_of_week, week_number)
);

-- Create indexes for better performance
CREATE INDEX idx_timetable_assignments_subject ON public.timetable_assignments(subject_id);
CREATE INDEX idx_timetable_assignments_teacher ON public.timetable_assignments(teacher_id);
CREATE INDEX idx_timetable_assignments_classroom ON public.timetable_assignments(classroom_id);
CREATE INDEX idx_timetable_assignments_time_slot ON public.timetable_assignments(time_slot_id);
CREATE INDEX idx_timetable_assignments_day ON public.timetable_assignments(day_of_week);

-- Create RLS policies
ALTER TABLE public.timetable_assignments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all timetable assignments
CREATE POLICY "Allow authenticated users to read timetable assignments" ON public.timetable_assignments
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admins to insert timetable assignments
CREATE POLICY "Allow admins to insert timetable assignments" ON public.timetable_assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Allow admins to update timetable assignments
CREATE POLICY "Allow admins to update timetable assignments" ON public.timetable_assignments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Allow admins to delete timetable assignments
CREATE POLICY "Allow admins to delete timetable assignments" ON public.timetable_assignments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_timetable_assignments_updated_at 
    BEFORE UPDATE ON public.timetable_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for complete timetable data with joins
CREATE OR REPLACE VIEW public.timetable_view AS
SELECT 
    ta.id,
    ta.day_of_week,
    ta.week_number,
    ta.notes,
    ta.created_at,
    ta.updated_at,
    -- Subject details
    s.id as subject_id,
    s.name as subject_name,
    s.code as subject_code,
    s.department as subject_department,
    s.credits as subject_credits,
    s.type as subject_type,
    s.color as subject_color,
    -- Teacher details
    t.id as teacher_id,
    t.name as teacher_name,
    t.email as teacher_email,
    t.phone as teacher_phone,
    t.department as teacher_department,
    -- Classroom details
    c.id as classroom_id,
    c.name as classroom_name,
    c.building as classroom_building,
    c.floor as classroom_floor,
    c.capacity as classroom_capacity,
    c.type as classroom_type,
    c.equipment as classroom_equipment,
    -- Time slot details
    ts.id as time_slot_id,
    ts.start_time,
    ts.end_time,
    ts.duration_minutes,
    ts.is_break_period
FROM public.timetable_assignments ta
JOIN public.subjects s ON ta.subject_id = s.id
JOIN public.teachers t ON ta.teacher_id = t.id
JOIN public.classrooms c ON ta.classroom_id = c.id
JOIN public.time_slots ts ON ta.time_slot_id = ts.id;

-- Grant permissions on the view
GRANT SELECT ON public.timetable_view TO authenticated;