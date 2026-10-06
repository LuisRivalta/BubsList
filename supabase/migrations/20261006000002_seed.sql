insert into public.categories (name, icon, color, kind, builtin) values
  ('Viagem', '✈️', '#0ea5e9', 'general', true),
  ('Restaurante', '🍽️', '#f97316', 'general', true),
  ('Atividade', '🎯', '#22c55e', 'general', true),
  ('Filme', '🎬', '#ef4444', 'movie', true),
  ('Série', '📺', '#8b5cf6', 'series', true),
  ('Anime', '🍥', '#ec4899', 'anime', true),
  ('Outro', '✨', '#64748b', 'general', true);

insert into public.achievements (name, description, icon, rarity, kind, rule_category_id, rule_min_difficulty, rule_count)
select a.name, a.description, a.icon, a.rarity, 'auto', c.id, a.min_difficulty, a.qty
from (values
  ('Primeira quest', 'Completar a primeira quest', '⭐', 'bronze', null::text, null::text, 1),
  ('Em ritmo', 'Completar 10 quests diferentes', '🔥', 'bronze', null, null, 10),
  ('Aventureiros', 'Completar 50 quests diferentes', '🧭', 'silver', null, null, 50),
  ('Veteranos', 'Completar 100 quests diferentes', '🏅', 'gold', null, null, 100),
  ('Lenda do casal', 'Completar 250 quests diferentes', '👑', 'platinum', null, null, 250),
  ('Pé na estrada', 'Fazer a primeira viagem', '✈️', 'bronze', 'Viagem', null, 1),
  ('Mochileiros', 'Fazer 5 viagens diferentes', '🎒', 'silver', 'Viagem', null, 5),
  ('Nômades', 'Fazer 15 viagens diferentes', '🌍', 'gold', 'Viagem', null, 15),
  ('Primeira garfada', 'Visitar o primeiro restaurante', '🍽️', 'bronze', 'Restaurante', null, 1),
  ('Bons de garfo', 'Visitar 10 restaurantes diferentes', '🍝', 'silver', 'Restaurante', null, 10),
  ('Críticos gastronômicos', 'Visitar 25 restaurantes diferentes', '🧑‍🍳', 'gold', 'Restaurante', null, 25),
  ('Guia Michelin do casal', 'Visitar 50 restaurantes diferentes', '🌟', 'platinum', 'Restaurante', null, 50),
  ('Mãos à obra', 'Completar a primeira atividade', '🎯', 'bronze', 'Atividade', null, 1),
  ('Agenda cheia', 'Completar 10 atividades diferentes', '📅', 'silver', 'Atividade', null, 10),
  ('Inquietos', 'Completar 30 atividades diferentes', '⚡', 'gold', 'Atividade', null, 30),
  ('Pipoca pronta', 'Assistir ao primeiro filme', '🍿', 'bronze', 'Filme', null, 1),
  ('Cinéfilos', 'Assistir a 10 filmes diferentes', '🎬', 'silver', 'Filme', null, 10),
  ('Maratona de cinema', 'Assistir a 50 filmes diferentes', '🎞️', 'gold', 'Filme', null, 50),
  ('Cinemateca', 'Assistir a 100 filmes diferentes', '🏛️', 'platinum', 'Filme', null, 100),
  ('Próximo episódio', 'Terminar a primeira série', '📺', 'bronze', 'Série', null, 1),
  ('Viciados em séries', 'Terminar 5 séries diferentes', '🛋️', 'silver', 'Série', null, 5),
  ('Só mais um episódio', 'Terminar 15 séries diferentes', '🌙', 'gold', 'Série', null, 15),
  ('Primeiro anime', 'Terminar o primeiro anime', '🍥', 'bronze', 'Anime', null, 1),
  ('Otakus', 'Terminar 5 animes diferentes', '🎌', 'silver', 'Anime', null, 5),
  ('Nakama', 'Terminar 20 animes diferentes', '🏴‍☠️', 'gold', 'Anime', null, 20),
  ('Desafio aceito', 'Completar uma quest Difícil ou Épica', '💪', 'silver', null, 'hard', 1),
  ('Sem medo de desafio', 'Completar 10 quests Difíceis ou Épicas', '🧗', 'gold', null, 'hard', 10),
  ('Lendários', 'Completar uma quest Épica', '🐉', 'gold', null, 'epic', 1),
  ('Épicos', 'Completar 5 quests Épicas', '🏆', 'platinum', null, 'epic', 5),
  ('Maratonistas', 'Terminar uma série Épica', '🏃', 'platinum', 'Série', 'epic', 1),
  ('Rei dos piratas', 'Terminar um anime Épico', '☠️', 'platinum', 'Anime', 'epic', 1)
) as a(name, description, icon, rarity, category, min_difficulty, qty)
left join public.categories c on c.name = a.category;

insert into public.achievements (name, description, icon, rarity, kind) values
  ('Nascer do sol juntos', 'Ver o nascer do sol juntos', '🌅', 'silver', 'manual'),
  ('Chefs do mundo', 'Cozinhar juntos um prato de outro país', '👩‍🍳', 'bronze', 'manual'),
  ('Acampamento', 'Acampar juntos', '⛺', 'silver', 'manual'),
  ('Na grade', 'Ir ao show do artista favorito', '🎤', 'gold', 'manual'),
  ('Aurora boreal', 'Ver uma aurora boreal juntos', '🌌', 'platinum', 'manual');
