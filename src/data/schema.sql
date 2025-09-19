-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE user_role AS ENUM ('admin', 'teacher');
CREATE TYPE classroom_type AS ENUM ('lecture', 'lab', 'seminar');
CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');

-- Users table
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'teacher',
  department VARCHAR(255),
  phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teachers table (extends users)
CREATE TABLE teachers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  department VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  max_hours_per_day INTEGER DEFAULT 8,
  unavailable_slots TEXT[] DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subjects table
CREATE TABLE subjects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  department VARCHAR(255) NOT NULL,
  semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
  hours_per_week INTEGER NOT NULL DEFAULT 0,
  lab_hours_per_week INTEGER NOT NULL DEFAULT 0,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classrooms table
CREATE TABLE classrooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 30,
  type classroom_type NOT NULL DEFAULT 'lecture',
  department VARCHAR(255) NOT NULL,
  equipment TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time slots table
CREATE TABLE time_slots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  day day_of_week NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration INTEGER NOT NULL, -- in minutes
  is_break BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(day, start_time)
);

-- Timetables table
CREATE TABLE timetables (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(255) NOT NULL,
  semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
  academic_year VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timetable entries table
CREATE TABLE timetable_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  timetable_id UUID REFERENCES timetables(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  time_slot_id UUID REFERENCES time_slots(id) ON DELETE CASCADE,
  day day_of_week NOT NULL,
  is_lab BOOLEAN DEFAULT FALSE,
  consecutive_slots INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(timetable_id, teacher_id, day, time_slot_id),
  UNIQUE(timetable_id, classroom_id, day, time_slot_id)
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_teachers_department ON teachers(department);
CREATE INDEX idx_subjects_department_semester ON subjects(department, semester);
CREATE INDEX idx_subjects_teacher ON subjects(teacher_id);
CREATE INDEX idx_classrooms_department_type ON classrooms(department, type);
CREATE INDEX idx_time_slots_day ON time_slots(day);
CREATE INDEX idx_timetables_department_semester ON timetables(department, semester);
CREATE INDEX idx_timetables_active ON timetables(is_active);
CREATE INDEX idx_timetable_entries_timetable ON timetable_entries(timetable_id);
CREATE INDEX idx_timetable_entries_day_slot ON timetable_entries(day, time_slot_id);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON classrooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_slots_updated_at BEFORE UPDATE ON time_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timetables_updated_at BEFORE UPDATE ON timetables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timetable_entries_updated_at BEFORE UPDATE ON timetable_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- RLS Policies for teachers table
CREATE POLICY "Teachers can view all teachers" ON teachers
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage teachers" ON teachers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Teachers can update their own data" ON teachers
  FOR UPDATE USING (user_id::text = auth.uid()::text);

-- RLS Policies for subjects table
CREATE POLICY "All authenticated users can view subjects" ON subjects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage subjects" ON subjects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

-- RLS Policies for classrooms table
CREATE POLICY "All authenticated users can view classrooms" ON classrooms
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage classrooms" ON classrooms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

-- RLS Policies for time_slots table
CREATE POLICY "All authenticated users can view time slots" ON time_slots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage time slots" ON time_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

-- RLS Policies for timetables table
CREATE POLICY "All authenticated users can view timetables" ON timetables
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage timetables" ON timetables
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

-- RLS Policies for timetable_entries table
CREATE POLICY "All authenticated users can view timetable entries" ON timetable_entries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage timetable entries" ON timetable_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

-- Insert default time slots (Monday to Friday, 9 AM to 5 PM with breaks)
INSERT INTO time_slots (day, start_time, end_time, duration, is_break) VALUES
  -- Monday
  ('monday', '09:00', '09:50', 50, false),
  ('monday', '09:50', '10:00', 10, true),
  ('monday', '10:00', '10:50', 50, false),
  ('monday', '10:50', '11:00', 10, true),
  ('monday', '11:00', '11:50', 50, false),
  ('monday', '11:50', '12:00', 10, true),
  ('monday', '12:00', '12:50', 50, false),
  ('monday', '12:50', '13:30', 40, true), -- Lunch break
  ('monday', '13:30', '14:20', 50, false),
  ('monday', '14:20', '14:30', 10, true),
  ('monday', '14:30', '15:20', 50, false),
  ('monday', '15:20', '15:30', 10, true),
  ('monday', '15:30', '16:20', 50, false),
  ('monday', '16:20', '16:30', 10, true),
  ('monday', '16:30', '17:20', 50, false),
  
  -- Tuesday
  ('tuesday', '09:00', '09:50', 50, false),
  ('tuesday', '09:50', '10:00', 10, true),
  ('tuesday', '10:00', '10:50', 50, false),
  ('tuesday', '10:50', '11:00', 10, true),
  ('tuesday', '11:00', '11:50', 50, false),
  ('tuesday', '11:50', '12:00', 10, true),
  ('tuesday', '12:00', '12:50', 50, false),
  ('tuesday', '12:50', '13:30', 40, true),
  ('tuesday', '13:30', '14:20', 50, false),
  ('tuesday', '14:20', '14:30', 10, true),
  ('tuesday', '14:30', '15:20', 50, false),
  ('tuesday', '15:20', '15:30', 10, true),
  ('tuesday', '15:30', '16:20', 50, false),
  ('tuesday', '16:20', '16:30', 10, true),
  ('tuesday', '16:30', '17:20', 50, false),
  
  -- Wednesday
  ('wednesday', '09:00', '09:50', 50, false),
  ('wednesday', '09:50', '10:00', 10, true),
  ('wednesday', '10:00', '10:50', 50, false),
  ('wednesday', '10:50', '11:00', 10, true),
  ('wednesday', '11:00', '11:50', 50, false),
  ('wednesday', '11:50', '12:00', 10, true),
  ('wednesday', '12:00', '12:50', 50, false),
  ('wednesday', '12:50', '13:30', 40, true),
  ('wednesday', '13:30', '14:20', 50, false),
  ('wednesday', '14:20', '14:30', 10, true),
  ('wednesday', '14:30', '15:20', 50, false),
  ('wednesday', '15:20', '15:30', 10, true),
  ('wednesday', '15:30', '16:20', 50, false),
  ('wednesday', '16:20', '16:30', 10, true),
  ('wednesday', '16:30', '17:20', 50, false),
  
  -- Thursday
  ('thursday', '09:00', '09:50', 50, false),
  ('thursday', '09:50', '10:00', 10, true),
  ('thursday', '10:00', '10:50', 50, false),
  ('thursday', '10:50', '11:00', 10, true),
  ('thursday', '11:00', '11:50', 50, false),
  ('thursday', '11:50', '12:00', 10, true),
  ('thursday', '12:00', '12:50', 50, false),
  ('thursday', '12:50', '13:30', 40, true),
  ('thursday', '13:30', '14:20', 50, false),
  ('thursday', '14:20', '14:30', 10, true),
  ('thursday', '14:30', '15:20', 50, false),
  ('thursday', '15:20', '15:30', 10, true),
  ('thursday', '15:30', '16:20', 50, false),
  ('thursday', '16:20', '16:30', 10, true),
  ('thursday', '16:30', '17:20', 50, false),
  
  -- Friday
  ('friday', '09:00', '09:50', 50, false),
  ('friday', '09:50', '10:00', 10, true),
  ('friday', '10:00', '10:50', 50, false),
  ('friday', '10:50', '11:00', 10, true),
  ('friday', '11:00', '11:50', 50, false),
  ('friday', '11:50', '12:00', 10, true),
  ('friday', '12:00', '12:50', 50, false),
  ('friday', '12:50', '13:30', 40, true),
  ('friday', '13:30', '14:20', 50, false),
  ('friday', '14:20', '14:30', 10, true),
  ('friday', '14:30', '15:20', 50, false),
  ('friday', '15:20', '15:30', 10, true),
  ('friday', '15:30', '16:20', 50, false),
  ('friday', '16:20', '16:30', 10, true),
  ('friday', '16:30', '17:20', 50, false),
  
  -- Saturday (Half day)
  ('saturday', '09:00', '09:50', 50, false),
  ('saturday', '09:50', '10:00', 10, true),
  ('saturday', '10:00', '10:50', 50, false),
  ('saturday', '10:50', '11:00', 10, true),
  ('saturday', '11:00', '11:50', 50, false),
  ('saturday', '11:50', '12:00', 10, true),
  ('saturday', '12:00', '12:50', 50, false);