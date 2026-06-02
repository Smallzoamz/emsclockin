-- Create exam system tables using email-based user tracking

-- 1. exam_questions: Question pool for exams
CREATE TABLE IF NOT EXISTS exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_type VARCHAR(50) NOT NULL, -- 'general_doctor' | 'specialist_doctor'
    question_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. exam_attempts: Store exam session and anti-cheat stats
CREATE TABLE IF NOT EXISTS exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255) NOT NULL, -- references doctor email
    exam_type VARCHAR(50) NOT NULL,
    randomized_questions JSONB NOT NULL, -- randomized subset of question IDs/texts
    student_answers JSONB DEFAULT '{}'::jsonb NOT NULL, -- mapping of question_id -> text answer
    status VARCHAR(50) DEFAULT 'in_progress' NOT NULL, -- 'in_progress' | 'submitted' | 'passed' | 'failed'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    focus_lost_count INT DEFAULT 0 NOT NULL,
    screen_share_detected BOOLEAN DEFAULT false NOT NULL,
    score DECIMAL(5,2),
    admin_feedback TEXT,
    graded_by VARCHAR(255), -- email of admin who graded
    graded_at TIMESTAMP WITH TIME ZONE
);

-- 3. user_inbox: Envelope mail system for users
CREATE TABLE IF NOT EXISTS user_inbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255) NOT NULL, -- receiver user email
    sender_name VARCHAR(100) DEFAULT 'ระบบหลังบ้าน' NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'message' NOT NULL, -- 'message' | 'exam'
    exam_type VARCHAR(50), -- 'general_doctor' | 'specialist_doctor'
    exam_question_count INT DEFAULT 5 NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    exam_attempt_id UUID REFERENCES exam_attempts(id) ON DELETE SET NULL, -- link to attempt
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
