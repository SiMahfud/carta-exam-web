-- Migration: Add bonus_time_minutes column to submissions table
-- Database: MySQL
-- Date: 2025-12-05

ALTER TABLE submissions ADD COLUMN bonus_time_minutes INT DEFAULT 0;
