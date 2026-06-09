-- PolisAI Civilization Schema
-- Run in Supabase SQL Editor

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

DO $$ BEGIN CREATE TYPE education_level AS ENUM (
    'none','primary','secondary','tertiary','postgraduate'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE political_alignment AS ENUM (
    'far_left','left','center_left','center','center_right','right','far_right'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE business_sector AS ENUM (
    'agriculture','manufacturing','services','technology',
    'healthcare','finance','energy','retail','education','defense'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE business_size AS ENUM (
    'micro','small','medium','large','corporation'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE government_type AS ENUM (
    'democracy','republic','constitutional_monarchy','absolute_monarchy',
    'autocracy','oligarchy','federation','theocracy'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE institution_type AS ENUM (
    'healthcare','education','military','police','judiciary',
    'central_bank','media','religion','ngo','research'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE policy_category AS ENUM (
    'economic','social','environmental','healthcare',
    'education','security','infrastructure','foreign','tax'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE policy_status AS ENUM (
    'proposed','active','repealed','rejected','expired'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE simulation_status AS ENUM (
    'draft','running','paused','completed','failed'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE event_type AS ENUM (
    'natural_disaster','economic_crisis','epidemic','war',
    'technological_breakthrough','social_unrest','election',
    'policy_change','cultural_shift','resource_shortage'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE event_severity AS ENUM (
    'minor','moderate','major','catastrophic'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE election_type AS ENUM (
    'general','local','referendum','presidential','senate'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE election_status AS ENUM (
    'scheduled','ongoing','completed','cancelled'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE infrastructure_type AS ENUM (
    'roads','railways','airports','hospitals','schools',
    'power_grid','water_supply','internet','housing','ports'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE relationship_type AS ENUM (
    'family','friend','colleague','rival','spouse','neighbor'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─── SIMULATIONS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS simulations (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id         UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name             TEXT           NOT NULL,
    description      TEXT,
    status           simulation_status NOT NULL DEFAULT 'draft',
    current_tick     INT            NOT NULL DEFAULT 0,
    tick_rate        INT            NOT NULL DEFAULT 1,   -- ticks per real second
    population_size  INT            NOT NULL DEFAULT 1000,
    config           JSONB          NOT NULL DEFAULT '{}',
    started_at       TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT simulations_tick_rate_positive    CHECK (tick_rate > 0),
    CONSTRAINT simulations_population_positive   CHECK (population_size > 0),
    CONSTRAINT simulations_tick_non_negative     CHECK (current_tick >= 0)
);


-- ─── GOVERNMENT ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS governments (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id    UUID           NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    name             TEXT           NOT NULL,
    type             government_type NOT NULL DEFAULT 'democracy',
    budget           NUMERIC(20,2)  NOT NULL DEFAULT 0,
    debt             NUMERIC(20,2)  NOT NULL DEFAULT 0,
    tax_revenue      NUMERIC(20,2)  NOT NULL DEFAULT 0,
    approval_rating  NUMERIC(5,2)   NOT NULL DEFAULT 50,
    gdp              NUMERIC(20,2)  NOT NULL DEFAULT 0,
    region           TEXT,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT governments_approval_range   CHECK (approval_rating BETWEEN 0 AND 100),
    CONSTRAINT governments_budget_check     CHECK (budget >= 0)
);


-- ─── CITIZENS ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS citizens (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id       UUID            NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    government_id       UUID            REFERENCES governments(id) ON DELETE SET NULL,
    first_name          TEXT            NOT NULL,
    last_name           TEXT            NOT NULL,
    age                 INT             NOT NULL,
    gender              TEXT            NOT NULL,
    occupation          TEXT,
    region              TEXT,

    -- Demographics (JSONB for extensibility)
    demographics        JSONB           NOT NULL DEFAULT '{}',
    -- expected keys: ethnicity, religion, marital_status, children, housing_type

    -- Big Five personality model (0.0 – 1.0 each)
    personality_traits  JSONB           NOT NULL DEFAULT '{}',
    -- expected keys: openness, conscientiousness, extraversion, agreeableness, neuroticism

    -- Socioeconomic
    income              NUMERIC(12,2)   NOT NULL DEFAULT 0,
    wealth              NUMERIC(14,2)   NOT NULL DEFAULT 0,
    education_level     education_level NOT NULL DEFAULT 'secondary',

    -- Wellbeing scores (0–100)
    happiness_score     NUMERIC(5,2)    NOT NULL DEFAULT 50,
    health_score        NUMERIC(5,2)    NOT NULL DEFAULT 50,
    stress_score        NUMERIC(5,2)    NOT NULL DEFAULT 50,

    -- Politics
    political_alignment political_alignment NOT NULL DEFAULT 'center',
    voting_likelihood   NUMERIC(5,2)    NOT NULL DEFAULT 50,  -- 0-100 %

    is_alive            BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT citizens_age_range           CHECK (age BETWEEN 0 AND 130),
    CONSTRAINT citizens_happiness_range     CHECK (happiness_score BETWEEN 0 AND 100),
    CONSTRAINT citizens_health_range        CHECK (health_score BETWEEN 0 AND 100),
    CONSTRAINT citizens_stress_range        CHECK (stress_score BETWEEN 0 AND 100),
    CONSTRAINT citizens_voting_range        CHECK (voting_likelihood BETWEEN 0 AND 100),
    CONSTRAINT citizens_income_non_neg      CHECK (income >= 0)
);


-- ─── BUSINESSES ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS businesses (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id    UUID           NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    government_id    UUID           REFERENCES governments(id) ON DELETE SET NULL,
    owner_citizen_id UUID           REFERENCES citizens(id) ON DELETE SET NULL,
    name             TEXT           NOT NULL,
    sector           business_sector NOT NULL,
    size             business_size   NOT NULL DEFAULT 'small',
    revenue          NUMERIC(18,2)  NOT NULL DEFAULT 0,
    profit_margin    NUMERIC(5,2)   NOT NULL DEFAULT 0,   -- percentage
    employee_count   INT            NOT NULL DEFAULT 1,
    tax_rate         NUMERIC(5,2)   NOT NULL DEFAULT 20,  -- percentage
    region           TEXT,
    is_active        BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT businesses_revenue_non_neg       CHECK (revenue >= 0),
    CONSTRAINT businesses_employees_positive    CHECK (employee_count >= 0),
    CONSTRAINT businesses_tax_rate_range        CHECK (tax_rate BETWEEN 0 AND 100)
);


-- ─── INSTITUTIONS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS institutions (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id       UUID            NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    government_id       UUID            REFERENCES governments(id) ON DELETE SET NULL,
    name                TEXT            NOT NULL,
    type                institution_type NOT NULL,
    funding             NUMERIC(16,2)   NOT NULL DEFAULT 0,
    effectiveness_score NUMERIC(5,2)    NOT NULL DEFAULT 50,
    trust_score         NUMERIC(5,2)    NOT NULL DEFAULT 50,
    capacity            INT             NOT NULL DEFAULT 1000,
    utilization         NUMERIC(5,2)    NOT NULL DEFAULT 0,  -- 0-100 %
    region              TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT institutions_effectiveness_range  CHECK (effectiveness_score BETWEEN 0 AND 100),
    CONSTRAINT institutions_trust_range          CHECK (trust_score BETWEEN 0 AND 100),
    CONSTRAINT institutions_utilization_range    CHECK (utilization BETWEEN 0 AND 100),
    CONSTRAINT institutions_capacity_positive    CHECK (capacity > 0)
);


-- ─── POLICIES ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS policies (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id    UUID           NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    government_id    UUID           NOT NULL REFERENCES governments(id) ON DELETE CASCADE,
    name             TEXT           NOT NULL,
    category         policy_category NOT NULL,
    description      TEXT,
    status           policy_status   NOT NULL DEFAULT 'proposed',
    budget_impact    NUMERIC(16,2)  NOT NULL DEFAULT 0,  -- negative = cost, positive = revenue
    popularity_score NUMERIC(5,2)   NOT NULL DEFAULT 50,
    enacted_tick     INT,
    repealed_tick    INT,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT policies_popularity_range    CHECK (popularity_score BETWEEN 0 AND 100),
    CONSTRAINT policies_tick_order          CHECK (repealed_tick IS NULL OR enacted_tick IS NULL OR repealed_tick >= enacted_tick)
);


-- ─── EVENTS ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS events (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id    UUID           NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    name             TEXT           NOT NULL,
    type             event_type      NOT NULL,
    severity         event_severity  NOT NULL DEFAULT 'minor',
    description      TEXT,
    tick             INT            NOT NULL DEFAULT 0,
    duration_ticks   INT            NOT NULL DEFAULT 1,
    affected_region  TEXT,
    impact           JSONB          NOT NULL DEFAULT '{}',
    -- expected keys: happiness_delta, health_delta, gdp_delta, affected_citizen_count
    is_active        BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT events_tick_non_negative     CHECK (tick >= 0),
    CONSTRAINT events_duration_positive     CHECK (duration_ticks > 0)
);


-- ─── ELECTIONS ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS elections (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id    UUID           NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    government_id    UUID           NOT NULL REFERENCES governments(id) ON DELETE CASCADE,
    name             TEXT           NOT NULL,
    type             election_type   NOT NULL DEFAULT 'general',
    status           election_status NOT NULL DEFAULT 'scheduled',
    scheduled_tick   INT            NOT NULL,
    completed_tick   INT,
    turnout_rate     NUMERIC(5,2)   NOT NULL DEFAULT 0,  -- 0-100 %
    winner_id        UUID           REFERENCES citizens(id) ON DELETE SET NULL,
    results          JSONB          NOT NULL DEFAULT '{}',
    -- expected keys: candidates [{citizen_id, votes, percentage}]
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT elections_turnout_range  CHECK (turnout_rate BETWEEN 0 AND 100),
    CONSTRAINT elections_tick_order     CHECK (completed_tick IS NULL OR completed_tick >= scheduled_tick)
);


-- ─── INFRASTRUCTURE ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS infrastructure (
    id               UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id    UUID                NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    government_id    UUID                REFERENCES governments(id) ON DELETE SET NULL,
    name             TEXT                NOT NULL,
    type             infrastructure_type NOT NULL,
    quality_score    NUMERIC(5,2)        NOT NULL DEFAULT 50,
    capacity         INT                 NOT NULL DEFAULT 1000,
    utilization      NUMERIC(5,2)        NOT NULL DEFAULT 0,
    maintenance_cost NUMERIC(14,2)       NOT NULL DEFAULT 0,
    construction_cost NUMERIC(14,2)      NOT NULL DEFAULT 0,
    region           TEXT,
    is_operational   BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT infra_quality_range      CHECK (quality_score BETWEEN 0 AND 100),
    CONSTRAINT infra_utilization_range  CHECK (utilization BETWEEN 0 AND 100),
    CONSTRAINT infra_capacity_positive  CHECK (capacity > 0)
);


-- ─── SIMULATION RESULTS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS simulation_results (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id    UUID           NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    tick             INT            NOT NULL,
    metrics          JSONB          NOT NULL DEFAULT '{}',
    -- expected keys: avg_happiness, avg_health, avg_income, gdp, unemployment_rate,
    --   gini_coefficient, crime_rate, literacy_rate, life_expectancy, approval_rating
    policy_snapshot  JSONB          NOT NULL DEFAULT '[]',  -- active policy IDs
    event_snapshot   JSONB          NOT NULL DEFAULT '[]',  -- active event IDs
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT sim_results_tick_non_neg    CHECK (tick >= 0),
    UNIQUE (simulation_id, tick)
);


-- ─── RELATIONSHIPS (citizen ↔ citizen) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS citizen_relationships (
    id               UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id    UUID                NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    citizen_a_id     UUID                NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
    citizen_b_id     UUID                NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
    type             relationship_type   NOT NULL,
    strength         NUMERIC(5,2)        NOT NULL DEFAULT 50,  -- 0-100
    created_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT citizen_rel_no_self_loop   CHECK (citizen_a_id <> citizen_b_id),
    CONSTRAINT citizen_rel_strength_range CHECK (strength BETWEEN 0 AND 100),
    UNIQUE (citizen_a_id, citizen_b_id, type)
);


-- ─── CITIZEN ↔ BUSINESS (employment) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS citizen_employment (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id       UUID           NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
    business_id      UUID           NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    role             TEXT,
    salary           NUMERIC(12,2)  NOT NULL DEFAULT 0,
    hired_tick       INT            NOT NULL DEFAULT 0,
    fired_tick       INT,
    is_active        BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT employment_salary_non_neg CHECK (salary >= 0)
);


-- ─── POLICY IMPACTS ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS policy_effects (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id        UUID           NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    simulation_id    UUID           NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    target_type      TEXT           NOT NULL,  -- 'citizen' | 'business' | 'institution'
    target_id        UUID           NOT NULL,
    effect           JSONB          NOT NULL DEFAULT '{}',
    -- expected keys: happiness_delta, income_delta, health_delta, tax_delta
    applied_tick     INT            NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);


-- ─── UPDATED_AT TRIGGERS ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'simulations','governments','citizens','businesses',
    'institutions','policies','elections','infrastructure'
  ] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS %I_updated_at ON %I;
      CREATE TRIGGER %I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    ', t, t, t, t);
  END LOOP;
END $$;


-- ─── INDEXES ─────────────────────────────────────────────────────────────────

-- simulations
CREATE INDEX IF NOT EXISTS idx_simulations_owner       ON simulations(owner_id);
CREATE INDEX IF NOT EXISTS idx_simulations_status      ON simulations(status);

-- citizens
CREATE INDEX IF NOT EXISTS idx_citizens_simulation     ON citizens(simulation_id);
CREATE INDEX IF NOT EXISTS idx_citizens_government     ON citizens(government_id);
CREATE INDEX IF NOT EXISTS idx_citizens_alignment      ON citizens(political_alignment);
CREATE INDEX IF NOT EXISTS idx_citizens_education      ON citizens(education_level);
CREATE INDEX IF NOT EXISTS idx_citizens_alive          ON citizens(simulation_id, is_alive);
CREATE INDEX IF NOT EXISTS idx_citizens_income         ON citizens(simulation_id, income);
CREATE INDEX IF NOT EXISTS idx_citizens_happiness      ON citizens(simulation_id, happiness_score);

-- businesses
CREATE INDEX IF NOT EXISTS idx_businesses_simulation   ON businesses(simulation_id);
CREATE INDEX IF NOT EXISTS idx_businesses_government   ON businesses(government_id);
CREATE INDEX IF NOT EXISTS idx_businesses_sector       ON businesses(simulation_id, sector);
CREATE INDEX IF NOT EXISTS idx_businesses_active       ON businesses(simulation_id, is_active);

-- governments
CREATE INDEX IF NOT EXISTS idx_governments_simulation  ON governments(simulation_id);

-- institutions
CREATE INDEX IF NOT EXISTS idx_institutions_simulation ON institutions(simulation_id);
CREATE INDEX IF NOT EXISTS idx_institutions_type       ON institutions(simulation_id, type);

-- policies
CREATE INDEX IF NOT EXISTS idx_policies_simulation     ON policies(simulation_id);
CREATE INDEX IF NOT EXISTS idx_policies_government     ON policies(government_id);
CREATE INDEX IF NOT EXISTS idx_policies_status         ON policies(simulation_id, status);
CREATE INDEX IF NOT EXISTS idx_policies_category       ON policies(simulation_id, category);

-- events
CREATE INDEX IF NOT EXISTS idx_events_simulation       ON events(simulation_id);
CREATE INDEX IF NOT EXISTS idx_events_tick             ON events(simulation_id, tick);
CREATE INDEX IF NOT EXISTS idx_events_active           ON events(simulation_id, is_active);

-- elections
CREATE INDEX IF NOT EXISTS idx_elections_simulation    ON elections(simulation_id);
CREATE INDEX IF NOT EXISTS idx_elections_government    ON elections(government_id);

-- infrastructure
CREATE INDEX IF NOT EXISTS idx_infra_simulation        ON infrastructure(simulation_id);
CREATE INDEX IF NOT EXISTS idx_infra_type              ON infrastructure(simulation_id, type);

-- simulation_results
CREATE INDEX IF NOT EXISTS idx_simresults_simulation   ON simulation_results(simulation_id);
CREATE INDEX IF NOT EXISTS idx_simresults_tick         ON simulation_results(simulation_id, tick DESC);

-- citizen_relationships
CREATE INDEX IF NOT EXISTS idx_citizen_rel_a           ON citizen_relationships(citizen_a_id);
CREATE INDEX IF NOT EXISTS idx_citizen_rel_b           ON citizen_relationships(citizen_b_id);
CREATE INDEX IF NOT EXISTS idx_citizen_rel_sim         ON citizen_relationships(simulation_id);

-- employment
CREATE INDEX IF NOT EXISTS idx_employment_citizen      ON citizen_employment(citizen_id);
CREATE INDEX IF NOT EXISTS idx_employment_business     ON citizen_employment(business_id);
CREATE INDEX IF NOT EXISTS idx_employment_active       ON citizen_employment(citizen_id, is_active);

-- policy_effects
CREATE INDEX IF NOT EXISTS idx_policy_effects_policy   ON policy_effects(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_effects_target   ON policy_effects(target_id);
CREATE INDEX IF NOT EXISTS idx_policy_effects_sim      ON policy_effects(simulation_id);
