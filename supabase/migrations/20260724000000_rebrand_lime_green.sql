-- Rebrand: verde limão fluorescente vira a cor primária padrão do Optimio.
-- Atualiza apenas quem ainda está na cor padrão original (roxo "271 91% 65%"),
-- preservando a escolha de quem já customizou a própria cor de propósito.
UPDATE public.profiles
SET primary_color = '72 100% 50%'
WHERE primary_color = '271 91% 65%';
