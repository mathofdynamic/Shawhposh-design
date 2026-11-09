UPDATE product_variants
SET color_name = 'مشکی ذغالی'
WHERE color_name = 'جغرافیای مشکی (ذغالی)';
--> statement-breakpoint
UPDATE products
SET presentation = replace(presentation, 'جهت داوم فرم یقه‌ها', 'جهت دوام فرم یقه‌ها')
WHERE instr(presentation, 'جهت داوم فرم یقه‌ها') > 0;
