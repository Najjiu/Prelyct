-- Create notifications table to track sent notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  election_id UUID REFERENCES elections(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('election_reminder', 'payment_alert', 'vote_update', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert notifications for users
CREATE POLICY "System can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to check if user wants to receive notifications
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_notification_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_settings RECORD;
BEGIN
  -- Get user settings
  SELECT * INTO v_settings
  FROM user_settings
  WHERE user_id = p_user_id;

  -- If no settings, use defaults (send all notifications)
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  -- Check email notifications master toggle
  IF NOT v_settings.email_notifications THEN
    RETURN FALSE;
  END IF;

  -- Check specific notification type
  CASE p_notification_type
    WHEN 'election_reminder' THEN
      RETURN v_settings.election_reminders;
    WHEN 'payment_alert' THEN
      RETURN v_settings.payment_alerts;
    WHEN 'vote_update' THEN
      RETURN v_settings.vote_updates;
    ELSE
      RETURN TRUE; -- System notifications always sent if email enabled
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


