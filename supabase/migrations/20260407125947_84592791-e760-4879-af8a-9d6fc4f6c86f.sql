
-- Merge April 7: keep row with ad data, add intro_call_booked, reset demo_booked
UPDATE b2b_ads_metrics 
SET intro_call_booked = 1, demo_booked = 0
WHERE id = '5da5aa36-9b9b-48d2-8366-be66948bee50';

DELETE FROM b2b_ads_metrics WHERE id = '10b39be4-02b7-4c45-bc5e-5efde0acd952';

-- Delete empty duplicate for March 2
DELETE FROM b2b_ads_metrics WHERE id = '35a19d11-876d-4f5b-afce-a0e4e2116d6b';

-- Now add unique constraint
ALTER TABLE b2b_ads_metrics ADD CONSTRAINT b2b_ads_metrics_date_unique UNIQUE (date);
