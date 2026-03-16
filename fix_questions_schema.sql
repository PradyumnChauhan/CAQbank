-- Add missing columns to questions table if they don't exist

ALTER TABLE questions
ADD COLUMN IF NOT EXISTS source_file TEXT,
ADD COLUMN IF NOT EXISTS source_num INTEGER;

-- Verify the columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'questions'
ORDER BY ordinal_position;
