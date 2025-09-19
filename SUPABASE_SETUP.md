# Supabase Database Setup Instructions

## The Problem
The current error occurs because:
1. Firebase Auth uses string-based user IDs (like `DCJeBpHsZJPzyKGyOtGi0Zfm95U2`)  
2. The original database schema expected UUID-based user IDs
3. This mismatch causes the 404 error when trying to fetch user data

## Solution: Update Database Schema

### Step 1: Access Your Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in with your account
3. Select your project: **yrodnrfhbidxlnblenju**

### Step 2: Reset Database (if tables already exist)
1. Go to **Database** → **Tables** in the left sidebar
2. If you see existing tables (`users`, `teachers`, etc.), you need to drop them first
3. Go to **SQL Editor** in the left sidebar
4. Run this command to drop existing tables:

```sql
-- Drop existing tables if they exist
DROP TABLE IF EXISTS timetable_entries CASCADE;
DROP TABLE IF EXISTS timetables CASCADE;
DROP TABLE IF EXISTS time_slots CASCADE;
DROP TABLE IF EXISTS classrooms CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS classroom_type CASCADE;
DROP TYPE IF EXISTS day_of_week CASCADE;
```

### Step 3: Create New Schema
1. In the **SQL Editor**, create a new query
2. Copy the entire contents of `database/fixed_schema.sql` 
3. Paste it into the SQL Editor
4. Click **Run** to execute the schema

### Step 4: Verify Setup
1. Go to **Database** → **Tables**
2. You should see these tables:
   - `users` (with `id` as TEXT)
   - `teachers`
   - `subjects`
   - `classrooms`
   - `time_slots`
   - `timetables`
   - `timetable_entries`

### Step 5: Check Authentication Settings
1. Go to **Authentication** → **Settings**
2. Make sure **Enable email confirmations** is **DISABLED** for development
3. Under **Auth Providers**, ensure **Email** is enabled

### Step 6: Test the Application
1. Refresh your application in the browser
2. Try to register a new account
3. The registration should now work without 404 errors

## Key Changes Made

### Database Schema Updates:
- ✅ **Users table**: Changed `id` from `UUID` to `TEXT` to accept Firebase Auth IDs
- ✅ **Foreign keys**: Updated all user references to use `TEXT` instead of `UUID`
- ✅ **RLS policies**: Fixed to work with Firebase Auth UIDs directly

### Expected Behavior After Fix:
1. **Registration**: Firebase creates user → User record created in Supabase with Firebase UID
2. **Login**: Firebase authenticates → Supabase fetches user data using Firebase UID  
3. **Teacher Role**: If user role is 'teacher', a teacher record is also created

## Troubleshooting

### If you still get 404 errors:
1. Check if the `users` table exists in Supabase
2. Verify the `id` column is of type `TEXT` not `UUID`
3. Make sure RLS policies are enabled and correct

### If you get permission errors:
1. Go to **Authentication** → **Policies**
2. Make sure policies exist for the `users` table
3. Check that the policies use `auth.uid()` correctly

### If registration fails:
1. Check the browser console for detailed error messages
2. Go to **Database** → **Logs** in Supabase to see database errors
3. Verify that the Firebase configuration in `.env` is correct

## Next Steps After Database Setup

Once the database is working:
1. ✅ Register as an admin user
2. ✅ Login and access the dashboard  
3. ✅ Add teachers, subjects, classrooms via the UI
4. ✅ Generate timetables using the algorithm
5. ✅ Test drag-and-drop functionality
6. ✅ Export timetables as PDF/PNG
7. ✅ Configure WhatsApp integration (optional)