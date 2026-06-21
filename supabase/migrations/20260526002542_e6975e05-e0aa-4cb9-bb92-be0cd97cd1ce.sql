
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_date timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assignee_user_id uuid;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tags text[] DEFAULT ARRAY[]::text[];
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_task_id uuid;
