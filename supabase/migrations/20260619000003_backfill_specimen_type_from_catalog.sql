UPDATE lab_order_items oi
SET specimen_type = c.specimen
FROM lab_test_catalog c
WHERE oi.lab_test_catalog_id = c.id
  AND oi.specimen_type IS NULL
  AND c.specimen IS NOT NULL;