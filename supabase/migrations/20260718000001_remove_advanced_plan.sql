-- Remove o plano "advanced" que nunca foi válido para profiles.plan
-- (check constraint só permite: basic, standard, unlimited)
DELETE FROM public.plans WHERE slug = 'advanced';

DELETE FROM public.system_settings
WHERE key = 'checkout_advanced_url';
