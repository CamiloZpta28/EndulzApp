-- ============================================================================
-- Patch 009 — cosas vetadas
--
-- Corre después de 001–008.
--
-- ⚠️ ESTE VA SOLO. No lo pegues junto con otro script.
--
-- `ALTER TYPE ... ADD VALUE` sí se puede correr dentro de una transacción
-- (Postgres 12+), pero el valor nuevo NO se puede USAR en la misma
-- transacción. Si este `alter` viaja con cualquier cosa que mencione
-- 'vetado', Postgres responde «unsafe use of new value of enum type».
-- Por eso el patch es una sola línea y no toca nada más.
--
-- No hace falta cambiar ninguna función: ni `import_profile_wishlist` ni
-- `reorder_wishlist` traen el tipo escrito a mano — lo reciben por parámetro,
-- así que el valor nuevo les sirve tal como están.
-- ============================================================================

alter type public.wishlist_type add value if not exists 'vetado';
