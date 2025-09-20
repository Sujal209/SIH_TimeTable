-- Fix RLS policies for timetable_assignments table
-- This addresses the "new row violates row-level security policy" error

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Allow authenticated users to read timetable assignments" ON public.timetable_assignments;
DROP POLICY IF EXISTS "Allow admins to insert timetable assignments" ON public.timetable_assignments;
DROP POLICY IF EXISTS "Allow admins to update timetable assignments" ON public.timetable_assignments;
DROP POLICY IF EXISTS "Allow admins to delete timetable assignments" ON public.timetable_assignments;

-- Option 1: Temporary fix - Allow all authenticated operations (less secure but functional)
-- Use this if you need immediate functionality while setting up proper auth

-- Allow authenticated users to read all timetable assignments
CREATE POLICY "Allow read timetable assignments" ON public.timetable_assignments
    FOR SELECT USING (true);

-- Allow authenticated users to insert timetable assignments
CREATE POLICY "Allow insert timetable assignments" ON public.timetable_assignments
    FOR INSERT WITH CHECK (true);

-- Allow authenticated users to update timetable assignments  
CREATE POLICY "Allow update timetable assignments" ON public.timetable_assignments
    FOR UPDATE USING (true);

-- Allow authenticated users to delete timetable assignments
CREATE POLICY "Allow delete timetable assignments" ON public.timetable_assignments
    FOR DELETE USING (true);

-- Option 2: Firebase-compatible RLS policies (more secure)
-- Comment out Option 1 and use this when you set up proper Firebase-Supabase auth integration

/*
-- Function to check if current user is admin based on custom JWT claims
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role = 'admin' 
        FROM public.users 
        WHERE id = (auth.jwt() ->> 'sub')::text
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow admins to perform all operations
CREATE POLICY "Admin full access timetable assignments" ON public.timetable_assignments
    FOR ALL USING (is_admin_user());

-- Allow teachers to read assignments
CREATE POLICY "Teachers read timetable assignments" ON public.timetable_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (auth.jwt() ->> 'sub')::text
            AND role IN ('admin', 'teacher')
        )
    );
*/

-- Option 3: Simplified role-based access using Firebase UID
-- This option assumes you store Firebase UID in users.id field

/*
-- Allow authenticated users with admin role to perform operations
CREATE POLICY "Firebase admin insert" ON public.timetable_assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (auth.jwt() ->> 'sub')::text 
            AND role = 'admin'
        )
    );

CREATE POLICY "Firebase admin update" ON public.timetable_assignments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (auth.jwt() ->> 'sub')::text 
            AND role = 'admin'
        )
    );

CREATE POLICY "Firebase admin delete" ON public.timetable_assignments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (auth.jwt() ->> 'sub')::text 
            AND role = 'admin'
        )
    );

CREATE POLICY "Firebase users read" ON public.timetable_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (auth.jwt() ->> 'sub')::text
        )
    );
*/

-- Add debugging function to help troubleshoot auth issues
CREATE OR REPLACE FUNCTION debug_auth_info()
RETURNS TABLE (
    current_user_id text,
    auth_uid text,
    jwt_sub text,
    user_exists boolean,
    user_role text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        current_user::text,
        auth.uid()::text,
        (auth.jwt() ->> 'sub')::text,
        EXISTS(SELECT 1 FROM public.users WHERE id = COALESCE(auth.uid()::text, (auth.jwt() ->> 'sub')::text)),
        (SELECT role FROM public.users WHERE id = COALESCE(auth.uid()::text, (auth.jwt() ->> 'sub')::text))
    ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on debug function
GRANT EXECUTE ON FUNCTION debug_auth_info() TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE public.timetable_assignments ENABLE ROW LEVEL SECURITY;

-- Grant basic permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timetable_assignments TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Refresh the timetable_view to ensure it works with new policies
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
    s.hours_per_week as subject_hours_per_week,
    s.lab_hours_per_week as subject_lab_hours_per_week,
    -- Teacher details
    t.id as teacher_id,
    t.name as teacher_name,
    t.email as teacher_email,
    t.phone as teacher_phone,
    t.department as teacher_department,
    -- Classroom details
    c.id as classroom_id,
    c.name as classroom_name,
    c.capacity as classroom_capacity,
    c.type as classroom_type,
    c.department as classroom_department,
    c.equipment as classroom_equipment,
    -- Time slot details
    ts.id as time_slot_id,
    ts.start_time,
    ts.end_time,
    ts.duration,
    ts.is_break
FROM public.timetable_assignments ta
JOIN public.subjects s ON ta.subject_id = s.id
JOIN public.teachers t ON ta.teacher_id = t.id
JOIN public.classrooms c ON ta.classroom_id = c.id
JOIN public.time_slots ts ON ta.time_slot_id = ts.id;

-- Grant permissions on the view
GRANT SELECT ON public.timetable_view TO authenticated;