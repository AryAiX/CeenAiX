UPDATE lab_order_items
SET loinc_code = test_code
WHERE loinc_code IS NULL
  AND test_code IS NOT NULL;