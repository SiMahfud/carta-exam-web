-- Migration: Add violation settings and access token columns
-- For MySQL

-- Add violation_settings to exam_templates
ALTER TABLE exam_templates ADD COLUMN violation_settings TEXT DEFAULT '{"detectTabSwitch":true,"detectCopyPaste":true,"detectRightClick":true,"detectScreenshot":true,"detectDevTools":true,"cooldownSeconds":5,"mode":"strict"}';

-- Add access_token to exam_sessions
ALTER TABLE exam_sessions ADD COLUMN access_token VARCHAR(10) NULL;
