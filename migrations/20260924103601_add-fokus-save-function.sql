CREATE OR REPLACE FUNCTION public.save_fokus_workspace(
  p_workspace_id UUID,
  p_locale TEXT,
  p_manual_order TEXT[],
  p_order_source TEXT,
  p_selected_task_id TEXT,
  p_tasks JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF p_locale NOT IN ('en', 'id') THEN
    RAISE EXCEPTION 'invalid locale';
  END IF;

  IF p_order_source NOT IN ('ai', 'manual') THEN
    RAISE EXCEPTION 'invalid order source';
  END IF;

  IF jsonb_typeof(p_tasks) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'tasks must be an array';
  END IF;

  INSERT INTO public.fokus_workspaces (
    id,
    locale,
    manual_order,
    order_source,
    selected_task_id
  )
  VALUES (
    p_workspace_id,
    p_locale,
    p_manual_order,
    p_order_source,
    p_selected_task_id
  )
  ON CONFLICT (id) DO UPDATE SET
    locale = EXCLUDED.locale,
    manual_order = EXCLUDED.manual_order,
    order_source = EXCLUDED.order_source,
    selected_task_id = EXCLUDED.selected_task_id;

  DELETE FROM public.fokus_tasks
  WHERE workspace_id = p_workspace_id;

  INSERT INTO public.fokus_tasks (
    workspace_id,
    id,
    title,
    description,
    category,
    due_label,
    due_group,
    due_time,
    priority,
    status,
    starred,
    signals,
    reminder,
    channels,
    position
  )
  SELECT
    p_workspace_id,
    task.value->>'id',
    task.value->>'title',
    task.value->>'description',
    task.value->>'category',
    task.value->>'dueLabel',
    task.value->>'dueGroup',
    task.value->>'dueTime',
    (task.value->>'priority')::SMALLINT,
    task.value->>'status',
    COALESCE((task.value->>'starred')::BOOLEAN, FALSE),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(task.value->'signals', '[]'::JSONB))),
    task.value->>'reminder',
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(task.value->'channels', '[]'::JSONB))),
    task.ordinality::INTEGER - 1
  FROM jsonb_array_elements(p_tasks) WITH ORDINALITY AS task(value, ordinality);

  INSERT INTO public.fokus_insights (
    workspace_id,
    task_id,
    id,
    kind,
    text,
    source,
    starred,
    impact,
    position
  )
  SELECT
    p_workspace_id,
    task.value->>'id',
    insight.value->>'id',
    insight.kind,
    insight.value->>'text',
    insight.value->>'source',
    COALESCE((insight.value->>'starred')::BOOLEAN, FALSE),
    (insight.value->>'impact')::SMALLINT,
    insight.ordinality::INTEGER - 1
  FROM jsonb_array_elements(p_tasks) AS task(value)
  CROSS JOIN LATERAL (
    SELECT upside.value, 'upside'::TEXT AS kind, upside.ordinality
    FROM jsonb_array_elements(COALESCE(task.value->'upsideItems', '[]'::JSONB))
      WITH ORDINALITY AS upside(value, ordinality)
    UNION ALL
    SELECT risk.value, 'risk'::TEXT AS kind, risk.ordinality
    FROM jsonb_array_elements(COALESCE(task.value->'riskItems', '[]'::JSONB))
      WITH ORDINALITY AS risk(value, ordinality)
  ) AS insight;
END;
$$;

REVOKE ALL ON FUNCTION public.save_fokus_workspace(UUID, TEXT, TEXT[], TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.save_fokus_workspace(UUID, TEXT, TEXT[], TEXT, TEXT, JSONB)
  TO project_admin;
