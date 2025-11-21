-- Security, Monitoring, and Advanced Features Migration
-- Adds: Blockchain audit trail, encryption, IP tracking, geolocation, white-label, monitoring

-- ============================================
-- 1. VOTE SECURITY & TRACKING ENHANCEMENTS
-- ============================================

-- Add geolocation and enhanced tracking to votes table
ALTER TABLE votes
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS geolocation_country TEXT,
ADD COLUMN IF NOT EXISTS geolocation_region TEXT,
ADD COLUMN IF NOT EXISTS geolocation_city TEXT,
ADD COLUMN IF NOT EXISTS geolocation_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS geolocation_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS encrypted_vote_data TEXT, -- Encrypted vote payload
ADD COLUMN IF NOT EXISTS encryption_key_id TEXT, -- Reference to encryption key version
ADD COLUMN IF NOT EXISTS blockchain_hash TEXT, -- Hash stored on blockchain
ADD COLUMN IF NOT EXISTS blockchain_tx_id TEXT, -- Blockchain transaction ID
ADD COLUMN IF NOT EXISTS blockchain_network TEXT, -- e.g., 'ethereum', 'polygon'
ADD COLUMN IF NOT EXISTS blockchain_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100), -- 0-100 risk score
ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT FALSE, -- Flagged for review
ADD COLUMN IF NOT EXISTS flag_reason TEXT;

-- Create indexes for security queries
CREATE INDEX IF NOT EXISTS idx_votes_ip_address ON votes(ip_address);
CREATE INDEX IF NOT EXISTS idx_votes_geolocation_country ON votes(geolocation_country);
CREATE INDEX IF NOT EXISTS idx_votes_blockchain_hash ON votes(blockchain_hash);
CREATE INDEX IF NOT EXISTS idx_votes_flagged ON votes(flagged);
CREATE INDEX IF NOT EXISTS idx_votes_risk_score ON votes(risk_score);

-- ============================================
-- 2. BLOCKCHAIN AUDIT TRAIL TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS blockchain_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vote_id UUID NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  hash TEXT NOT NULL UNIQUE, -- Vote hash
  transaction_id TEXT, -- Blockchain transaction ID
  network TEXT NOT NULL DEFAULT 'ethereum', -- Blockchain network
  block_number BIGINT, -- Block number on blockchain
  block_hash TEXT, -- Block hash
  gas_used BIGINT, -- Gas used for transaction
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  confirmation_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB -- Additional blockchain metadata
);

CREATE INDEX IF NOT EXISTS idx_blockchain_audit_vote_id ON blockchain_audit_log(vote_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_audit_election_id ON blockchain_audit_log(election_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_audit_hash ON blockchain_audit_log(hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_audit_status ON blockchain_audit_log(status);

-- ============================================
-- 3. ENCRYPTION KEYS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS encryption_keys (
  id TEXT PRIMARY KEY, -- Key version ID (e.g., 'v1', 'v2')
  key_encrypted TEXT NOT NULL, -- Encrypted encryption key (encrypted with master key)
  algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rotated_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB
);

-- Insert default encryption key version
INSERT INTO encryption_keys (id, key_encrypted, algorithm, is_active)
VALUES ('v1', 'PLACEHOLDER_ENCRYPTED_KEY', 'AES-256-GCM', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. IP TRACKING & SUSPICIOUS ACTIVITY
-- ============================================

CREATE TABLE IF NOT EXISTS ip_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address INET NOT NULL,
  election_id UUID REFERENCES elections(id) ON DELETE CASCADE,
  vote_count INTEGER DEFAULT 0,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  country TEXT,
  region TEXT,
  city TEXT,
  is_vpn BOOLEAN DEFAULT FALSE,
  is_proxy BOOLEAN DEFAULT FALSE,
  is_tor BOOLEAN DEFAULT FALSE,
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  flagged BOOLEAN DEFAULT FALSE,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_ip_tracking_ip ON ip_tracking(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_election ON ip_tracking(election_id);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_flagged ON ip_tracking(flagged);

-- ============================================
-- 5. WHITE-LABEL BRANDING
-- ============================================

CREATE TABLE IF NOT EXISTS white_label_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#2563eb', -- Hex color
  secondary_color TEXT DEFAULT '#60a5fa',
  accent_color TEXT DEFAULT '#2563eb',
  custom_css TEXT, -- Custom CSS overrides
  custom_domain TEXT UNIQUE, -- Custom domain (e.g., votes.organization.com)
  email_from_name TEXT DEFAULT 'Prelyct Votes',
  email_from_address TEXT,
  footer_text TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_white_label_user_id ON white_label_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_white_label_domain ON white_label_settings(custom_domain);

-- ============================================
-- 6. MONITORING & ALERTS
-- ============================================

CREATE TABLE IF NOT EXISTS system_monitoring (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID REFERENCES elections(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL, -- 'vote_count', 'turnout', 'error_rate', 'response_time', etc.
  metric_value DECIMAL(10, 2) NOT NULL,
  threshold_value DECIMAL(10, 2), -- Alert threshold
  status TEXT NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'warning', 'critical')),
  message TEXT,
  metadata JSONB,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_election_id ON system_monitoring(election_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_metric_type ON system_monitoring(metric_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_status ON system_monitoring(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_recorded_at ON system_monitoring(recorded_at DESC);

-- Alert rules table
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  election_id UUID REFERENCES elections(id) ON DELETE CASCADE, -- NULL for global rules
  name TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('greater_than', 'less_than', 'equals', 'not_equals')),
  threshold_value DECIMAL(10, 2) NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  notification_channels TEXT[] DEFAULT ARRAY['email', 'in_app'], -- Array of channels
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_user_id ON alert_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_election_id ON alert_rules(election_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON alert_rules(is_active);

-- Alerts table (triggered alerts)
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  election_id UUID REFERENCES elections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value DECIMAL(10, 2) NOT NULL,
  threshold_value DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  notification_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_election_id ON alerts(election_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);

-- ============================================
-- 7. CUSTOM REPORTS
-- ============================================

CREATE TABLE IF NOT EXISTS custom_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  election_id UUID REFERENCES elections(id) ON DELETE CASCADE, -- NULL for cross-election reports
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL CHECK (report_type IN ('election_results', 'voter_analytics', 'security_audit', 'financial', 'custom')),
  filters JSONB NOT NULL DEFAULT '{}', -- JSON filter configuration
  columns JSONB NOT NULL DEFAULT '[]', -- Selected columns/fields
  format TEXT NOT NULL DEFAULT 'pdf' CHECK (format IN ('pdf', 'excel', 'csv', 'json')),
  schedule_enabled BOOLEAN DEFAULT FALSE,
  schedule_cron TEXT, -- Cron expression for scheduled reports
  last_generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_reports_user_id ON custom_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_reports_election_id ON custom_reports(election_id);

-- Report generation history
CREATE TABLE IF NOT EXISTS report_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES custom_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_url TEXT, -- URL to generated report file
  file_size BIGINT, -- File size in bytes
  format TEXT NOT NULL,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_report_generations_report_id ON report_generations(report_id);
CREATE INDEX IF NOT EXISTS idx_report_generations_user_id ON report_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_report_generations_status ON report_generations(status);

-- ============================================
-- 8. WHATSAPP INTEGRATION
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL, -- WhatsApp Business API phone number ID
  access_token_encrypted TEXT NOT NULL, -- Encrypted access token
  business_account_id TEXT,
  webhook_verify_token TEXT,
  webhook_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_user_id ON whatsapp_integrations(user_id);

-- WhatsApp message logs
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID NOT NULL REFERENCES whatsapp_integrations(id) ON DELETE CASCADE,
  election_id UUID REFERENCES elections(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('voting_link', 'reminder', 'results', 'custom')),
  message_content TEXT NOT NULL,
  template_id TEXT, -- WhatsApp template ID if using templates
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  whatsapp_message_id TEXT, -- WhatsApp API message ID
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_integration ON whatsapp_messages(integration_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_election ON whatsapp_messages(election_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_recipient ON whatsapp_messages(recipient_phone);

-- ============================================
-- 9. RLS POLICIES
-- ============================================

-- Blockchain audit log policies
ALTER TABLE blockchain_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view blockchain audit logs for their elections" ON blockchain_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM elections
      WHERE elections.id = blockchain_audit_log.election_id
      AND elections.user_id = auth.uid()
    )
  );

-- Encryption keys policies (admin only - typically managed by system)
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only system can manage encryption keys" ON encryption_keys
  FOR ALL USING (false); -- Restrict all access, manage via service role

-- IP tracking policies
ALTER TABLE ip_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view IP tracking for their elections" ON ip_tracking
  FOR SELECT USING (
    election_id IS NULL OR EXISTS (
      SELECT 1 FROM elections
      WHERE elections.id = ip_tracking.election_id
      AND elections.user_id = auth.uid()
    )
  );

-- White label settings policies
ALTER TABLE white_label_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own white label settings" ON white_label_settings
  FOR ALL USING (auth.uid() = user_id);

-- System monitoring policies
ALTER TABLE system_monitoring ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view monitoring for their elections" ON system_monitoring
  FOR SELECT USING (
    election_id IS NULL OR EXISTS (
      SELECT 1 FROM elections
      WHERE elections.id = system_monitoring.election_id
      AND elections.user_id = auth.uid()
    )
  );

-- Alert rules policies
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own alert rules" ON alert_rules
  FOR ALL USING (auth.uid() = user_id);

-- Alerts policies
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own alerts" ON alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts" ON alerts
  FOR UPDATE USING (auth.uid() = user_id);

-- Custom reports policies
ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own custom reports" ON custom_reports
  FOR ALL USING (auth.uid() = user_id);

-- Report generations policies
ALTER TABLE report_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own report generations" ON report_generations
  FOR SELECT USING (auth.uid() = user_id);

-- WhatsApp integrations policies
ALTER TABLE whatsapp_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own WhatsApp integrations" ON whatsapp_integrations
  FOR ALL USING (auth.uid() = user_id);

-- WhatsApp messages policies
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view WhatsApp messages for their integrations" ON whatsapp_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM whatsapp_integrations
      WHERE whatsapp_integrations.id = whatsapp_messages.integration_id
      AND whatsapp_integrations.user_id = auth.uid()
    )
  );

-- ============================================
-- 10. FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update white label updated_at
CREATE TRIGGER update_white_label_updated_at
  BEFORE UPDATE ON white_label_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update alert rules updated_at
CREATE TRIGGER update_alert_rules_updated_at
  BEFORE UPDATE ON alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update custom reports updated_at
CREATE TRIGGER update_custom_reports_updated_at
  BEFORE UPDATE ON custom_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate risk score based on IP and voting patterns
CREATE OR REPLACE FUNCTION calculate_vote_risk_score()
RETURNS TRIGGER AS $$
DECLARE
  ip_vote_count INTEGER;
  ip_risk_score INTEGER := 0;
  geolocation_risk INTEGER := 0;
BEGIN
  -- Count votes from same IP in this election
  SELECT COUNT(*) INTO ip_vote_count
  FROM votes
  WHERE election_id = NEW.election_id
    AND ip_address = NEW.ip_address
    AND id != NEW.id;
  
  -- Calculate risk based on IP vote count
  IF ip_vote_count > 10 THEN
    ip_risk_score := 80;
  ELSIF ip_vote_count > 5 THEN
    ip_risk_score := 50;
  ELSIF ip_vote_count > 2 THEN
    ip_risk_score := 30;
  END IF;
  
  -- Check if IP is VPN/Proxy/Tor
  IF EXISTS (
    SELECT 1 FROM ip_tracking
    WHERE ip_address = NEW.ip_address
    AND (is_vpn = TRUE OR is_proxy = TRUE OR is_tor = TRUE)
  ) THEN
    ip_risk_score := ip_risk_score + 20;
  END IF;
  
  -- Set risk score
  NEW.risk_score := LEAST(ip_risk_score + geolocation_risk, 100);
  
  -- Flag if risk score is high
  IF NEW.risk_score >= 70 THEN
    NEW.flagged := TRUE;
    NEW.flag_reason := 'High risk score based on IP patterns';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate risk score on vote insert
CREATE TRIGGER calculate_vote_risk_trigger
  BEFORE INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION calculate_vote_risk_score();

-- Function to update IP tracking
CREATE OR REPLACE FUNCTION update_ip_tracking()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert IP tracking record
  INSERT INTO ip_tracking (
    ip_address,
    election_id,
    vote_count,
    country,
    region,
    city,
    last_seen
  )
  VALUES (
    NEW.ip_address,
    NEW.election_id,
    1,
    NEW.geolocation_country,
    NEW.geolocation_region,
    NEW.geolocation_city,
    NOW()
  )
  ON CONFLICT (ip_address, election_id) DO UPDATE
  SET
    vote_count = ip_tracking.vote_count + 1,
    last_seen = NOW(),
    country = COALESCE(EXCLUDED.country, ip_tracking.country),
    region = COALESCE(EXCLUDED.region, ip_tracking.region),
    city = COALESCE(EXCLUDED.city, ip_tracking.city);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update IP tracking on vote insert
CREATE TRIGGER update_ip_tracking_trigger
  AFTER INSERT ON votes
  FOR EACH ROW
  WHEN (NEW.ip_address IS NOT NULL)
  EXECUTE FUNCTION update_ip_tracking();

-- Add unique constraint for IP tracking
CREATE UNIQUE INDEX IF NOT EXISTS idx_ip_tracking_unique ON ip_tracking(ip_address, election_id);


