# Case Studies Feature Setup Guide

## Overview
The case studies feature allows admins to import and manage complex case scenarios with multiple questions, while students can browse and solve case studies to apply their knowledge in practical scenarios.

## Database Schema

The feature uses 4 new tables:

### 1. `case_studies`
- `id` (UUID, PK)
- `subject_id` (UUID, FK to subjects)
- `case_number` (integer)
- `title` (text)
- `context` (text) - Main case narrative
- `context_tables` (jsonb) - Optional reference tables within the case
- `difficulty_level` (enum: 'easy', 'medium', 'hard')
- `estimated_time_minutes` (integer)
- `published` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Indexes:** subject_id, published

### 2. `case_study_questions`
- `id` (UUID, PK)
- `case_study_id` (UUID, FK to case_studies)
- `question_number` (integer)
- `question_text` (text)
- `options_json` (jsonb) - Array of {id: string, text: string}
- `correct_answer` (text)
- `reason` (text) - Explanation for the correct answer
- `created_at` (timestamp)

**Indexes:** case_study_id, question_number

### 3. `case_study_attempts`
- `id` (UUID, PK)
- `student_id` (UUID, FK to auth.users)
- `case_study_id` (UUID, FK to case_studies)
- `question_id` (UUID, FK to case_study_questions)
- `selected_answer` (text)
- `is_correct` (boolean)
- `created_at` (timestamp)

**Indexes:** student_id, case_study_id, question_id

### 4. `case_study_progress`
- `id` (UUID, PK)
- `student_id` (UUID, FK to auth.users)
- `case_study_id` (UUID, FK to case_studies)
- `completed_questions` (integer)
- `total_questions` (integer)
- `accuracy` (float)
- `last_attempt` (timestamp)
- `updated_at` (timestamp)

**Indexes:** student_id, case_study_id

## Database Initialization

1. Copy the schema from `case_studies_schema.sql`
2. Open your Supabase project SQL editor
3. Paste and execute the schema
4. Verify all tables are created with `\dt` command

## File Structure

### New Components

```
app/
├── case-study/
│   └── actions.ts              # Server actions for case studies
├── admin/
│   └── subjects/
│       └── [id]/
│           └── case-studies/
│               └── page.tsx     # Admin panel to manage cases
└── student/
    └── case-studies/
        ├── page.tsx             # List all available cases
        └── [id]/
            └── page.tsx         # Solve a specific case
```

### Modified Files

- `app/admin/subjects/page.tsx` - Added "Case Studies" link for each subject
- `app/student/layout.tsx` - Added "Case Studies" navigation link

## API Functions

### importCaseStudiesAction(subjectId, casesData)
Import case studies from JSON data.

**Parameters:**
- `subjectId` (string) - Subject to import into
- `casesData` (any[]) - Array of case objects from JSON

**JSON Format Expected:**
```json
[
  {
    "case_scenario_number": 1,
    "context": "Case description...",
    "tables": [
      {
        "table_name": "Financial Data",
        "headers": ["Item", "Amount"],
        "rows": [["Revenue", "100000"]]
      }
    ],
    "questions": [
      {
        "number": 1,
        "text": "Question text?",
        "options": [
          {"letter": "a", "text": "Option A"},
          {"letter": "b", "text": "Option B"}
        ],
        "correct_answer": "a",
        "reason": "Explanation..."
      }
    ]
  }
]
```

### getCaseStudiesAction(subjectId)
Get all published case studies for a subject.

**Parameters:**
- `subjectId` (string) - Subject ID or 'all' for all cases

**Returns:**
Array of case studies with metadata

### getCaseStudyDetailAction(caseStudyId)
Get full case details including all questions and tables.

**Parameters:**
- `caseStudyId` (string) - Case study ID

**Returns:**
Case study with questions array and formatted tables

### submitCaseAnswerAction(caseStudyId, questionId, selectedAnswer)
Submit answer for a question. Automatically tracked to current user.

**Parameters:**
- `caseStudyId` (string)
- `questionId` (string)
- `selectedAnswer` (string) - Selected option ID

**Returns:**
Result with correctness and reasoning

### getCaseStudyProgressAction(caseStudyId)
Get student's progress on a specific case. Automatically uses current user.

**Parameters:**
- `caseStudyId` (string)

**Returns:**
Progress object with:
- `completedQuestion` - Number of answered questions
- `totalQuestions` - Total questions in case
- `accuracy` - Percentage correct
- `answers` - Array of previous answers

### deleteCaseStudyAction(caseStudyId)
Delete a case study (admin only).

**Parameters:**
- `caseStudyId` (string)

## Admin Workflow

1. Navigate to Admin → Subjects
2. Click "Case Studies" next to the desired subject
3. Upload a JSON file with case data
4. View imported cases with difficulty levels
5. Delete cases as needed

## Student Workflow

1. Navigate to Student Dashboard → Case Studies
2. Browse available cases (filtered by subject)
3. Click "Start Case" or "Continue" to begin solving
4. Read case context and reference tables
5. Answer questions one by one
6. View explanations after submitting
7. Track accuracy and progress

## Converting Case Data to JSON

Use the `extract_cases.py` script to convert markdown files:

```bash
python extract_cases.py -i input_file.md -o output.json
```

The script will generate properly formatted JSON suitable for import.

## Features

### Admin Dashboard
- View all case studies by subject
- Import bulk case data from JSON
- Track case metadata (difficulty, estimated time)
- Delete cases

### Student Interface
- Browse case studies with progress tracking
- Difficulty indicators (Easy/Medium/Hard)
- Time estimates for planning
- Progress bars showing completion status
- Continue from where they left off

### Case Solving
- Context with optional reference tables
- Multiple choice questions
- Instant answer submission
- Correctness feedback
- Detailed explanations after answering
- Progress tracking across questions

## Performance Considerations

1. **Indexes** - Key columns are indexed for fast queries
2. **JSON Storage** - Case tables stored as JSONB for flexibility
3. **RLS Policies** - Ensure students only see their own progress
4. **Pagination** - Consider adding pagination for large case lists

## Next Steps

1. Run the SQL schema (`case_studies_schema.sql`) in Supabase
2. Test admin import flow with sample JSON
3. Verify student case solving interface
4. Set up initial case content using extract_cases.py

## Troubleshooting

### Cases not appearing for students
- Ensure `published = true` in database
- Check subject_id matches student's enrolled subjects
- Verify RLS policies allow student access

### Import failing
- Validate JSON structure matches expected format
- Check file isn't too large for single import
- Verify subject_id exists

### Answer submission failing
- Confirm user is authenticated
- Check case_study_id and question_id exist
- Verify option ID matches one in case_study_questions

## Security Notes

- RLS policies restrict students to their own progress data
- Admin functions check user role before allowing modifications
- Answer validation compares against database records
