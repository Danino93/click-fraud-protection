-- הוספת עמודות חסרות לטבלת clicks
-- הפעל את הקוד הזה ב-Supabase SQL Editor

-- הוספת עמודת click_type
ALTER TABLE clicks 
ADD COLUMN IF NOT EXISTS click_type VARCHAR(20) DEFAULT 'organic';

-- הוספת עמודת is_paid
ALTER TABLE clicks 
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;

-- עדכון הנתונים הקיימים
UPDATE clicks 
SET click_type = CASE 
  WHEN gclid IS NOT NULL AND gclid != '' THEN 'paid' 
  ELSE 'organic' 
END,
is_paid = CASE 
  WHEN gclid IS NOT NULL AND gclid != '' THEN true 
  ELSE false 
END
WHERE click_type IS NULL OR is_paid IS NULL;

-- הוספת אינדקס לביצועים טובים יותר
CREATE INDEX IF NOT EXISTS clicks_click_type_idx ON clicks (click_type);
CREATE INDEX IF NOT EXISTS clicks_is_paid_idx ON clicks (is_paid);

-- הצגת מבנה הטבלה המעודכן
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'clicks' 
ORDER BY ordinal_position; 