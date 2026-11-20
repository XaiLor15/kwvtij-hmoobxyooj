-- ⚠ ONLY for a BRAND-NEW project where you are NOT importing old data.
-- The first migration (20260707083951) inserts DEMO rows (15 members, 5 events,
-- 15 transactions, 3 news). This removes exactly those demo rows by id.
-- Do NOT run this on a database that contains real data with these ids.
-- (scripts/migrate-data.mjs --wipe-target already replaces them if you import.)

BEGIN;
DELETE FROM public.transactions WHERE id IN (
  'TXN-100001','TXN-100002','TXN-100003','TXN-100004','TXN-100005','TXN-100006','TXN-100007',
  'TXN-100008','TXN-100009','TXN-100010','TXN-100011','TXN-100012','TXN-100013','TXN-100014','TXN-100015');
DELETE FROM public.news WHERE id IN (1, 2, 3) AND author IN ('ບຸນມີ ແສງສະຫວັນ','ສຸພາພອນ ແສງສະຫວັນ','ສົມພອນ ແສງສະຫວັນ');
DELETE FROM public.events WHERE id BETWEEN 1 AND 5 AND organizer IN
  ('ບຸນມີ ແສງສະຫວັນ','ສົມພອນ ແສງສະຫວັນ','ບົວວັນ ແສງສະຫວັນ','ວິໄລ ສຸວັນນະວົງ','ຄຳເພັງ ແສງສະຫວັນ');
DELETE FROM public.member_relations WHERE member_id BETWEEN 1 AND 15 AND related_id BETWEEN 1 AND 15;
UPDATE public.members SET parent_id = NULL WHERE id BETWEEN 1 AND 15;
DELETE FROM public.members
 WHERE id BETWEEN 1 AND 15
   AND (phone LIKE '020 %' OR (id IN (9, 15) AND phone = '-'));
COMMIT;
