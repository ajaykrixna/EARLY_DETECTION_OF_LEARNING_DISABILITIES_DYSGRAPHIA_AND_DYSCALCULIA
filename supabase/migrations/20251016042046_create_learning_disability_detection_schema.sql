-- Learning Disability Detection System - Database Schema
-- 
-- 1. New Tables
--    - users_profile: User profiles with language preferences
--    - dysgraphia_tests: Handwriting analysis test results
--    - dyscalculia_tests: Math reasoning test results
--    - test_reports: Generated reports for download
--    - model_metadata: ML model information and metrics
-- 
-- 2. Security
--    - Enable RLS on all tables
--    - Users can read/write their own data
--    - Model metadata is publicly readable

-- Users Profile Table
CREATE TABLE IF NOT EXISTS users_profile (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  age integer,
  language_preference text DEFAULT 'en' CHECK (language_preference IN ('en', 'ml', 'hi')),
  role text DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'parent', 'doctor')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Dysgraphia Tests Table
CREATE TABLE IF NOT EXISTS dysgraphia_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  prediction_class text NOT NULL CHECK (prediction_class IN ('Normal', 'Low', 'High')),
  confidence_score numeric(5,4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  gradcam_url text,
  model_version text DEFAULT '1.0',
  created_at timestamptz DEFAULT now()
);

-- Dyscalculia Tests Table
CREATE TABLE IF NOT EXISTS dyscalculia_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quiz_responses jsonb NOT NULL,
  prediction_class text NOT NULL CHECK (prediction_class IN ('Normal', 'Low', 'High')),
  confidence_score numeric(5,4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  feature_importance jsonb,
  model_version text DEFAULT '1.0',
  created_at timestamptz DEFAULT now()
);

-- Test Reports Table
CREATE TABLE IF NOT EXISTS test_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  test_type text NOT NULL CHECK (test_type IN ('dysgraphia', 'dyscalculia')),
  test_id uuid NOT NULL,
  report_data jsonb NOT NULL,
  pdf_url text,
  created_at timestamptz DEFAULT now()
);

-- Model Metadata Table
CREATE TABLE IF NOT EXISTS model_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type text NOT NULL CHECK (model_type IN ('dysgraphia', 'dyscalculia')),
  version text NOT NULL,
  accuracy numeric(5,4),
  roc_curve_data jsonb,
  confusion_matrix jsonb,
  trained_at timestamptz,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(model_type, version)
);

-- Enable Row Level Security
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE dysgraphia_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE dyscalculia_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users_profile
CREATE POLICY "Users can view own profile"
  ON users_profile FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users_profile FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users_profile FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for dysgraphia_tests
CREATE POLICY "Users can view own dysgraphia tests"
  ON dysgraphia_tests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dysgraphia tests"
  ON dysgraphia_tests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for dyscalculia_tests
CREATE POLICY "Users can view own dyscalculia tests"
  ON dyscalculia_tests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dyscalculia tests"
  ON dyscalculia_tests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for test_reports
CREATE POLICY "Users can view own reports"
  ON test_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports"
  ON test_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for model_metadata (publicly readable)
CREATE POLICY "Anyone can view active model metadata"
  ON model_metadata FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dysgraphia_tests_user_id ON dysgraphia_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_dysgraphia_tests_created_at ON dysgraphia_tests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dyscalculia_tests_user_id ON dyscalculia_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_dyscalculia_tests_created_at ON dyscalculia_tests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_reports_user_id ON test_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_model_metadata_active ON model_metadata(model_type, is_active);