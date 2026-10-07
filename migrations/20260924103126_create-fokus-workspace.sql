CREATE TABLE public.fokus_workspaces (
  id UUID PRIMARY KEY,
  locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'id')),
  manual_order TEXT[],
  order_source TEXT NOT NULL DEFAULT 'ai' CHECK (order_source IN ('ai', 'manual')),
  selected_task_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.fokus_tasks (
  workspace_id UUID NOT NULL REFERENCES public.fokus_workspaces(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  due_label TEXT NOT NULL,
  due_group TEXT NOT NULL CHECK (due_group IN ('today', 'tomorrow', 'later')),
  due_time TEXT NOT NULL,
  priority SMALLINT NOT NULL CHECK (priority BETWEEN 0 AND 100),
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'done')),
  starred BOOLEAN NOT NULL DEFAULT FALSE,
  signals TEXT[] NOT NULL DEFAULT '{}',
  reminder TEXT NOT NULL,
  channels TEXT[] NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, id)
);

CREATE TABLE public.fokus_insights (
  workspace_id UUID NOT NULL,
  task_id TEXT NOT NULL,
  id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('upside', 'risk')),
  text TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('ai', 'human')),
  starred BOOLEAN NOT NULL DEFAULT FALSE,
  impact SMALLINT NOT NULL CHECK (impact BETWEEN 1 AND 5),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, id),
  FOREIGN KEY (workspace_id, task_id)
    REFERENCES public.fokus_tasks(workspace_id, id)
    ON DELETE CASCADE
);

CREATE INDEX fokus_tasks_workspace_position_idx
  ON public.fokus_tasks(workspace_id, position);

CREATE INDEX fokus_insights_task_position_idx
  ON public.fokus_insights(workspace_id, task_id, kind, position);

CREATE TRIGGER fokus_workspaces_updated_at
  BEFORE UPDATE ON public.fokus_workspaces
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER fokus_tasks_updated_at
  BEFORE UPDATE ON public.fokus_tasks
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER fokus_insights_updated_at
  BEFORE UPDATE ON public.fokus_insights
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.fokus_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fokus_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fokus_insights ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.fokus_workspaces FROM anon, authenticated;
REVOKE ALL ON public.fokus_tasks FROM anon, authenticated;
REVOKE ALL ON public.fokus_insights FROM anon, authenticated;
