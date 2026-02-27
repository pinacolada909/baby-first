-- ============================================================
-- BabyStep - Complete Supabase Database Schema
-- ============================================================

-- ============================================================
-- 1. TABLES (created first so functions can reference them)
-- ============================================================

-- ---- profiles ----
CREATE TABLE public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ---- babies ----
CREATE TABLE public.babies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  birth_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.babies ENABLE ROW LEVEL SECURITY;

-- ---- baby_caregivers ----
CREATE TABLE public.baby_caregivers (
  baby_id      UUID NOT NULL REFERENCES public.babies ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users  ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('primary', 'member')),
  display_name TEXT,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (baby_id, user_id)
);

ALTER TABLE public.baby_caregivers ENABLE ROW LEVEL SECURITY;

-- ---- baby_invites ----
CREATE TABLE public.baby_invites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id    UUID NOT NULL REFERENCES public.babies ON DELETE CASCADE,
  code       CHAR(6) NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  used_by    UUID REFERENCES auth.users ON DELETE SET NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.baby_invites ENABLE ROW LEVEL SECURITY;

-- ---- sleep_sessions ----
CREATE TABLE public.sleep_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id        UUID NOT NULL REFERENCES public.babies ON DELETE CASCADE,
  caregiver_id   UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  start_time     TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time       TIMESTAMPTZ,
  duration_hours DOUBLE PRECISION,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sleep_sessions ENABLE ROW LEVEL SECURITY;

-- ---- diaper_changes ----
CREATE TABLE public.diaper_changes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id      UUID NOT NULL REFERENCES public.babies ON DELETE CASCADE,
  caregiver_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  status       TEXT NOT NULL CHECK (status IN ('wet', 'dirty', 'mixed', 'dry')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.diaper_changes ENABLE ROW LEVEL SECURITY;

-- ---- feedings ----
CREATE TABLE public.feedings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id          UUID NOT NULL REFERENCES public.babies ON DELETE CASCADE,
  caregiver_id     UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  fed_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  feeding_type     TEXT NOT NULL CHECK (feeding_type IN ('breastmilk', 'formula', 'ready_to_feed')),
  volume_ml        INT,
  duration_minutes INT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedings ENABLE ROW LEVEL SECURITY;

-- ---- time_blocks ----
CREATE TABLE public.time_blocks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id      UUID NOT NULL REFERENCES public.babies ON DELETE CASCADE,
  caregiver_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  block_type   TEXT NOT NULL CHECK (block_type IN ('care', 'rest')),
  start_time   TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time     TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;

-- ---- care_tasks ----
CREATE TABLE public.care_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id      UUID NOT NULL REFERENCES public.babies ON DELETE CASCADE,
  caregiver_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  task_type    TEXT NOT NULL CHECK (task_type IN (
                  'change_diapers', 'feeding', 'cooking',
                  'cleaning', 'laundry', 'doctor_visit', 'shopping'
               )),
  completed    BOOLEAN NOT NULL DEFAULT false,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.care_tasks ENABLE ROW LEVEL SECURITY;

-- ---- standing_sessions ----
CREATE TABLE public.standing_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id      UUID NOT NULL REFERENCES public.babies ON DELETE CASCADE,
  caregiver_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  start_time   TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.standing_sessions ENABLE ROW LEVEL SECURITY;

-- Add recovering caregiver setting to babies
ALTER TABLE public.babies ADD COLUMN IF NOT EXISTS recovering_caregiver_id UUID REFERENCES auth.users(id);

-- ============================================================
-- 2. HELPER FUNCTIONS (tables exist now, safe to reference)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_baby_caregiver(_baby_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.baby_caregivers
    WHERE baby_id = _baby_id
      AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_primary_caregiver(_baby_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.baby_caregivers
    WHERE baby_id = _baby_id
      AND user_id = _user_id
      AND role = 'primary'
  );
$$;

CREATE OR REPLACE FUNCTION public.shares_baby_with(_profile_user_id UUID, _viewer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.baby_caregivers a
    JOIN public.baby_caregivers b ON a.baby_id = b.baby_id
    WHERE a.user_id = _profile_user_id
      AND b.user_id = _viewer_id
  );
$$;

-- ============================================================
-- 3. ROW-LEVEL SECURITY POLICIES
-- ============================================================

-- ---- profiles policies ----
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.shares_baby_with(id, auth.uid())
  );

CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING  (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---- babies policies ----
CREATE POLICY "babies_select"
  ON public.babies FOR SELECT
  TO authenticated
  USING (public.is_baby_caregiver(id, auth.uid()));

CREATE POLICY "babies_insert"
  ON public.babies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "babies_update"
  ON public.babies FOR UPDATE
  TO authenticated
  USING  (public.is_primary_caregiver(id, auth.uid()))
  WITH CHECK (public.is_primary_caregiver(id, auth.uid()));

CREATE POLICY "babies_delete"
  ON public.babies FOR DELETE
  TO authenticated
  USING (public.is_primary_caregiver(id, auth.uid()));

-- ---- baby_caregivers policies ----
CREATE POLICY "baby_caregivers_select"
  ON public.baby_caregivers FOR SELECT
  TO authenticated
  USING (public.is_baby_caregiver(baby_id, auth.uid()));

CREATE POLICY "baby_caregivers_insert"
  ON public.baby_caregivers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "baby_caregivers_delete"
  ON public.baby_caregivers FOR DELETE
  TO authenticated
  USING (public.is_primary_caregiver(baby_id, auth.uid()));

-- ---- baby_invites policies ----
CREATE POLICY "baby_invites_select"
  ON public.baby_invites FOR SELECT
  TO authenticated
  USING (public.is_primary_caregiver(baby_id, auth.uid()));

CREATE POLICY "baby_invites_insert"
  ON public.baby_invites FOR INSERT
  TO authenticated
  WITH CHECK (public.is_primary_caregiver(baby_id, auth.uid()));

CREATE POLICY "baby_invites_update_redeem"
  ON public.baby_invites FOR UPDATE
  TO authenticated
  USING  (used_by IS NULL AND expires_at > now())
  WITH CHECK (used_by = auth.uid());

-- ---- sleep_sessions policies ----
CREATE POLICY "sleep_sessions_select"
  ON public.sleep_sessions FOR SELECT
  TO authenticated
  USING (public.is_baby_caregiver(baby_id, auth.uid()));

CREATE POLICY "sleep_sessions_insert"
  ON public.sleep_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_baby_caregiver(baby_id, auth.uid())
    AND caregiver_id = auth.uid()
  );

CREATE POLICY "sleep_sessions_delete"
  ON public.sleep_sessions FOR DELETE
  TO authenticated
  USING (
    public.is_primary_caregiver(baby_id, auth.uid())
    OR caregiver_id = auth.uid()
  );

-- ---- diaper_changes policies ----
CREATE POLICY "diaper_changes_select"
  ON public.diaper_changes FOR SELECT
  TO authenticated
  USING (public.is_baby_caregiver(baby_id, auth.uid()));

CREATE POLICY "diaper_changes_insert"
  ON public.diaper_changes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_baby_caregiver(baby_id, auth.uid())
    AND caregiver_id = auth.uid()
  );

CREATE POLICY "diaper_changes_delete"
  ON public.diaper_changes FOR DELETE
  TO authenticated
  USING (
    public.is_primary_caregiver(baby_id, auth.uid())
    OR caregiver_id = auth.uid()
  );

-- ---- feedings policies ----
CREATE POLICY "feedings_select"
  ON public.feedings FOR SELECT
  TO authenticated
  USING (public.is_baby_caregiver(baby_id, auth.uid()));

CREATE POLICY "feedings_insert"
  ON public.feedings FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_baby_caregiver(baby_id, auth.uid())
    AND caregiver_id = auth.uid()
  );

CREATE POLICY "feedings_delete"
  ON public.feedings FOR DELETE
  TO authenticated
  USING (
    public.is_primary_caregiver(baby_id, auth.uid())
    OR caregiver_id = auth.uid()
  );

-- ---- time_blocks policies ----
CREATE POLICY "time_blocks_select"
  ON public.time_blocks FOR SELECT
  TO authenticated
  USING (public.is_baby_caregiver(baby_id, auth.uid()));

CREATE POLICY "time_blocks_insert"
  ON public.time_blocks FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_baby_caregiver(baby_id, auth.uid())
  );

CREATE POLICY "time_blocks_delete"
  ON public.time_blocks FOR DELETE
  TO authenticated
  USING (
    public.is_primary_caregiver(baby_id, auth.uid())
    OR caregiver_id = auth.uid()
  );

-- ---- care_tasks policies ----
CREATE POLICY "care_tasks_select"
  ON public.care_tasks FOR SELECT
  TO authenticated
  USING (public.is_baby_caregiver(baby_id, auth.uid()));

CREATE POLICY "care_tasks_insert"
  ON public.care_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_baby_caregiver(baby_id, auth.uid())
    AND caregiver_id = auth.uid()
  );

CREATE POLICY "care_tasks_update"
  ON public.care_tasks FOR UPDATE
  TO authenticated
  USING  (public.is_baby_caregiver(baby_id, auth.uid()))
  WITH CHECK (public.is_baby_caregiver(baby_id, auth.uid()));

CREATE POLICY "care_tasks_delete"
  ON public.care_tasks FOR DELETE
  TO authenticated
  USING (
    public.is_primary_caregiver(baby_id, auth.uid())
    OR caregiver_id = auth.uid()
  );

-- ============================================================
-- 4. INDEXES
-- ============================================================

CREATE INDEX idx_sleep_sessions_baby_id    ON public.sleep_sessions (baby_id);
CREATE INDEX idx_sleep_sessions_start_time ON public.sleep_sessions (start_time);

CREATE INDEX idx_diaper_changes_baby_id    ON public.diaper_changes (baby_id);
CREATE INDEX idx_diaper_changes_changed_at ON public.diaper_changes (changed_at);

CREATE INDEX idx_feedings_baby_id ON public.feedings (baby_id);
CREATE INDEX idx_feedings_fed_at  ON public.feedings (fed_at);

CREATE INDEX idx_time_blocks_baby_id    ON public.time_blocks (baby_id);
CREATE INDEX idx_time_blocks_start_time ON public.time_blocks (start_time);

CREATE INDEX idx_care_tasks_baby_id     ON public.care_tasks (baby_id);
CREATE INDEX idx_care_tasks_assigned_at ON public.care_tasks (assigned_at);

-- ============================================================
-- 5. TRIGGER: auto-create profile on auth.users insert
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 6. RPC: redeem_invite
-- ============================================================

CREATE OR REPLACE FUNCTION public.redeem_invite(_code TEXT, _display_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite   RECORD;
  _baby_id  UUID;
  _user_id  UUID := auth.uid();
BEGIN
  -- Validate the invite code
  SELECT *
    INTO _invite
    FROM public.baby_invites
   WHERE code = _code
     AND used_by IS NULL
     AND expires_at > now()
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  _baby_id := _invite.baby_id;

  -- Prevent duplicate membership
  IF public.is_baby_caregiver(_baby_id, _user_id) THEN
    RAISE EXCEPTION 'You are already a caregiver for this baby';
  END IF;

  -- Mark the invite as used
  UPDATE public.baby_invites
     SET used_by = _user_id,
         used_at = now()
   WHERE id = _invite.id;

  -- Create the caregiver junction row
  INSERT INTO public.baby_caregivers (baby_id, user_id, role, display_name)
  VALUES (_baby_id, _user_id, 'member', _display_name);

  RETURN _baby_id;
END;
$$;

-- ============================================================
-- 7. RPC: create_baby_with_caregiver
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_baby_with_caregiver(
  _name TEXT,
  _birth_date DATE DEFAULT NULL,
  _display_name TEXT DEFAULT 'Parent'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _baby_id UUID;
  _user_id UUID := auth.uid();
BEGIN
  INSERT INTO public.babies (name, birth_date)
  VALUES (_name, _birth_date)
  RETURNING id INTO _baby_id;

  INSERT INTO public.baby_caregivers (baby_id, user_id, role, display_name)
  VALUES (_baby_id, _user_id, 'primary', _display_name);

  RETURN _baby_id;
END;
$$;

-- ============================================================
-- 8. EMAIL PREFERENCES
-- ============================================================

CREATE TABLE public.email_preferences (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  daily_summary_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_preferences_select"
  ON public.email_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "email_preferences_insert"
  ON public.email_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "email_preferences_update"
  ON public.email_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 9. REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.sleep_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.diaper_changes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.care_tasks;

-- ============================================================
-- 10. GROWTH RECORDS & MILESTONES
-- ============================================================

-- ---- growth_records ----
CREATE TABLE public.growth_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id      UUID NOT NULL REFERENCES public.babies ON DELETE CASCADE,
  caregiver_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  measured_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  weight_kg    DOUBLE PRECISION,
  height_cm    DOUBLE PRECISION,
  head_cm      DOUBLE PRECISION,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.growth_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "growth_records_select"
  ON public.growth_records FOR SELECT
  TO authenticated
  USING (public.is_baby_caregiver(baby_id, auth.uid()));

CREATE POLICY "growth_records_insert"
  ON public.growth_records FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_baby_caregiver(baby_id, auth.uid())
    AND caregiver_id = auth.uid()
  );

CREATE POLICY "growth_records_delete"
  ON public.growth_records FOR DELETE
  TO authenticated
  USING (
    public.is_primary_caregiver(baby_id, auth.uid())
    OR caregiver_id = auth.uid()
  );

CREATE INDEX idx_growth_records_baby_id ON public.growth_records (baby_id);
CREATE INDEX idx_growth_records_measured_at ON public.growth_records (measured_at);

-- ---- milestones ----
CREATE TABLE public.milestones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id       UUID NOT NULL REFERENCES public.babies ON DELETE CASCADE,
  milestone_key TEXT NOT NULL,
  achieved_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(baby_id, milestone_key)
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "milestones_select"
  ON public.milestones FOR SELECT
  TO authenticated
  USING (public.is_baby_caregiver(baby_id, auth.uid()));

CREATE POLICY "milestones_insert"
  ON public.milestones FOR INSERT
  TO authenticated
  WITH CHECK (public.is_baby_caregiver(baby_id, auth.uid()));

CREATE POLICY "milestones_delete"
  ON public.milestones FOR DELETE
  TO authenticated
  USING (public.is_baby_caregiver(baby_id, auth.uid()));

CREATE INDEX idx_milestones_baby_id ON public.milestones (baby_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.growth_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.milestones;

-- ============================================================
-- 11. STANDING SESSIONS (Mom Recovery)
-- ============================================================

CREATE POLICY "standing_sessions_select"
  ON public.standing_sessions FOR SELECT
  TO authenticated
  USING (public.is_baby_caregiver(baby_id, auth.uid()));

CREATE POLICY "standing_sessions_insert"
  ON public.standing_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_baby_caregiver(baby_id, auth.uid())
    AND caregiver_id = auth.uid()
  );

CREATE POLICY "standing_sessions_update"
  ON public.standing_sessions FOR UPDATE
  TO authenticated
  USING (caregiver_id = auth.uid())
  WITH CHECK (caregiver_id = auth.uid());

CREATE POLICY "standing_sessions_delete"
  ON public.standing_sessions FOR DELETE
  TO authenticated
  USING (
    public.is_primary_caregiver(baby_id, auth.uid())
    OR caregiver_id = auth.uid()
  );

CREATE INDEX idx_standing_sessions_baby_id ON public.standing_sessions (baby_id);
CREATE INDEX idx_standing_sessions_start_time ON public.standing_sessions (start_time);

ALTER PUBLICATION supabase_realtime ADD TABLE public.standing_sessions;

-- time_blocks update policy (for handoff/extend)
CREATE POLICY "time_blocks_update"
  ON public.time_blocks FOR UPDATE
  TO authenticated
  USING (public.is_baby_caregiver(baby_id, auth.uid()))
  WITH CHECK (public.is_baby_caregiver(baby_id, auth.uid()));

-- ============================================================
-- 12. PUMPING SESSIONS & MILK STASH
-- ============================================================

-- ---- pumping_sessions ----
CREATE TABLE public.pumping_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id          UUID NOT NULL REFERENCES public.babies ON DELETE CASCADE,
  caregiver_id     UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  pumped_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_minutes INT,
  volume_ml        INT NOT NULL,
  side             TEXT NOT NULL CHECK (side IN ('left', 'right', 'both')),
  storage          TEXT NOT NULL CHECK (storage IN ('fed_immediately', 'fridge', 'freezer')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pumping_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pumping_sessions_select"
  ON public.pumping_sessions FOR SELECT
  TO authenticated
  USING (public.is_baby_caregiver(baby_id, auth.uid()));

CREATE POLICY "pumping_sessions_insert"
  ON public.pumping_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_baby_caregiver(baby_id, auth.uid())
    AND caregiver_id = auth.uid()
  );

CREATE POLICY "pumping_sessions_delete"
  ON public.pumping_sessions FOR DELETE
  TO authenticated
  USING (
    public.is_primary_caregiver(baby_id, auth.uid())
    OR caregiver_id = auth.uid()
  );

CREATE INDEX idx_pumping_sessions_baby_id   ON public.pumping_sessions (baby_id);
CREATE INDEX idx_pumping_sessions_pumped_at ON public.pumping_sessions (pumped_at);

ALTER PUBLICATION supabase_realtime ADD TABLE public.pumping_sessions;

-- ---- milk_stash ----
CREATE TABLE public.milk_stash (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id             UUID NOT NULL REFERENCES public.babies ON DELETE CASCADE,
  pumping_session_id  UUID REFERENCES public.pumping_sessions ON DELETE SET NULL,
  stored_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  storage_type        TEXT NOT NULL CHECK (storage_type IN ('fridge', 'freezer')),
  volume_ml           INT NOT NULL,
  used_ml             INT NOT NULL DEFAULT 0,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.milk_stash ENABLE ROW LEVEL SECURITY;

CREATE POLICY "milk_stash_select"
  ON public.milk_stash FOR SELECT
  TO authenticated
  USING (public.is_baby_caregiver(baby_id, auth.uid()));

CREATE POLICY "milk_stash_insert"
  ON public.milk_stash FOR INSERT
  TO authenticated
  WITH CHECK (public.is_baby_caregiver(baby_id, auth.uid()));

CREATE POLICY "milk_stash_update"
  ON public.milk_stash FOR UPDATE
  TO authenticated
  USING (public.is_baby_caregiver(baby_id, auth.uid()))
  WITH CHECK (public.is_baby_caregiver(baby_id, auth.uid()));

CREATE POLICY "milk_stash_delete"
  ON public.milk_stash FOR DELETE
  TO authenticated
  USING (
    public.is_primary_caregiver(baby_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.pumping_sessions ps
      WHERE ps.id = pumping_session_id
        AND ps.caregiver_id = auth.uid()
    )
  );

CREATE INDEX idx_milk_stash_baby_id   ON public.milk_stash (baby_id);
CREATE INDEX idx_milk_stash_stored_at ON public.milk_stash (stored_at);

ALTER PUBLICATION supabase_realtime ADD TABLE public.milk_stash;

-- ---- feedings: add optional milk_stash link ----
ALTER TABLE public.feedings ADD COLUMN IF NOT EXISTS milk_stash_id UUID REFERENCES public.milk_stash ON DELETE SET NULL;

-- ---- RPC: atomic milk stash deduction ----
CREATE OR REPLACE FUNCTION public.use_milk_stash(
  _stash_id UUID,
  _volume_ml INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.milk_stash
  SET used_ml = used_ml + _volume_ml
  WHERE id = _stash_id
    AND (used_ml + _volume_ml) <= volume_ml;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient milk in stash or stash not found';
  END IF;
END;
$$;
