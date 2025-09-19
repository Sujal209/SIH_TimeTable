-- Fix teachers table to make user_id nullable for admin-created teachers
-- Run this in your Supabase SQL Editor

-- Make user_id nullable in teachers table
ALTER TABLE teachers ALTER COLUMN user_id DROP NOT NULL;

-- Update the foreign key constraint to allow nulls
-- First drop the existing constraint
ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_user_id_fkey;

-- Recreate the constraint to allow nulls
ALTER TABLE teachers ADD CONSTRAINT teachers_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;