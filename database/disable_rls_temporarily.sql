-- QUICK FIX: Temporarily disable RLS for timetable_assignments
-- This will allow your application to work immediately while you set up proper auth
-- SECURITY WARNING: This makes the table accessible to all authenticated users

-- Disable RLS on timetable_assignments table
ALTER TABLE public.timetable_assignments DISABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT ALL ON public.timetable_assignments TO authenticated;
GRANT ALL ON public.timetable_view TO authenticated;

-- Alternative: Keep RLS enabled but allow all operations
-- (Uncomment these lines and comment out the DISABLE command above if you prefer)
/*
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow authenticated users to read timetable assignments" ON public.timetable_assignments;
DROP POLICY IF EXISTS "Allow admins to insert timetable assignments" ON public.timetable_assignments;
DROP POLICY IF EXISTS "Allow admins to update timetable assignments" ON public.timetable_assignments;
DROP POLICY IF EXISTS "Allow admins to delete timetable assignments" ON public.timetable_assignments;

-- Create permissive policies that allow all authenticated users
CREATE POLICY "Allow all for authenticated" ON public.timetable_assignments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
*/

-- Ensure sequences are accessible
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- For production, you should re-enable RLS with proper policies later:
-- ALTER TABLE public.timetable_assignments ENABLE ROW LEVEL SECURITY;
-- Then implement proper policies based on your auth setup