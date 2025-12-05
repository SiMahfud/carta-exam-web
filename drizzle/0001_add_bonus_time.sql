-- Add bonus_time_minutes column to submissions table
ALTER TABLE submissions ADD COLUMN bonus_time_minutes INTEGER DEFAULT 0;
