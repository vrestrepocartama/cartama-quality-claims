-- ═══════════════════════════════════════════════════════════════════
-- MIGRACIÓN v8 — Analytics + Alertas Inteligentes
-- Ejecutar en Supabase SQL Editor una sola vez
-- ═══════════════════════════════════════════════════════════════════

-- 1) Configuración de alertas (una sola fila, id=1)
CREATE TABLE IF NOT EXISTS alert_config (
  id INT PRIMARY KEY DEFAULT 1,
  -- Alerta 1: Reincidencia del cliente por defecto
  a1_enabled BOOLEAN DEFAULT TRUE,
  a1_min_claims INT DEFAULT 3,
  a1_window_days INT DEFAULT 30,
  -- Alerta 2: Racha de defecto (transversal)
  a2_enabled BOOLEAN DEFAULT TRUE,
  a2_min_claims INT DEFAULT 5,
  a2_window_days INT DEFAULT 14,
  -- Alerta 3: Cliente inusualmente activo
  a3_enabled BOOLEAN DEFAULT TRUE,
  a3_multiplier NUMERIC(3,1) DEFAULT 2.0,
  a3_min_claims INT DEFAULT 3,
  a3_window_days INT DEFAULT 30,
  -- Alerta 4: Cliente tranquilo que reclama
  a4_enabled BOOLEAN DEFAULT TRUE,
  a4_silence_days INT DEFAULT 90,
  a4_max_monthly_avg NUMERIC(3,1) DEFAULT 1.0,
  -- Alerta 5: Combinación problemática histórica
  a5_enabled BOOLEAN DEFAULT TRUE,
  a5_min_cases INT DEFAULT 3,
  a5_min_proceed_pct INT DEFAULT 60,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT,
  CHECK (id = 1)
);

INSERT INTO alert_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 2) Log de alertas disparadas por claim
CREATE TABLE IF NOT EXISTS claim_insights (
  id BIGSERIAL PRIMARY KEY,
  claim_id BIGINT REFERENCES claims(id) ON DELETE CASCADE,
  alert_key TEXT NOT NULL,          -- 'a1', 'a2', 'a3', 'a4', 'a5'
  alert_title TEXT,
  alert_message TEXT,
  severity TEXT,                    -- 'info', 'warning', 'danger'
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB                    -- ids de claims relacionados, números, etc.
);

CREATE INDEX IF NOT EXISTS idx_claim_insights_claim ON claim_insights(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_insights_key ON claim_insights(alert_key);

-- 3) RLS mínimo si aplica (opcional según config actual)
-- ALTER TABLE alert_config ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE claim_insights ENABLE ROW LEVEL SECURITY;
