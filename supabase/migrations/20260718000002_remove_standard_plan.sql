-- Remove o plano "standard/pro" — apenas basic e unlimited permanecem
DELETE FROM public.plans WHERE slug IN ('standard', 'pro');

DELETE FROM public.system_settings WHERE key = 'checkout_pro_url';
