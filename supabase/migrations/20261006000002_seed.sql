insert into public.categories (name, icon, color, kind, builtin) values
  ('Viagem', 'plane', '#0ea5e9', 'general', true),
  ('Restaurante', 'utensils', '#f97316', 'general', true),
  ('Atividade', 'target', '#22c55e', 'general', true),
  ('Filme', 'clapperboard', '#ef4444', 'movie', true),
  ('Série', 'tv', '#8b5cf6', 'series', true),
  ('Anime', 'swords', '#ec4899', 'anime', true),
  ('Outro', 'sparkles', '#64748b', 'general', true);

insert into public.achievements (name, description, icon, rarity, kind, rule_category_id, rule_min_difficulty, rule_count)
select a.name, a.description, a.icon, a.rarity, 'auto', c.id, a.min_difficulty, a.qty
from (values
  ('Primeira quest', 'Completar a primeira quest', 'star', 'bronze', null::text, null::text, 1),
  ('Em ritmo', 'Completar 10 quests diferentes', 'flame', 'bronze', null, null, 10),
  ('Aventureiros', 'Completar 50 quests diferentes', 'compass', 'silver', null, null, 50),
  ('Veteranos', 'Completar 100 quests diferentes', 'medal', 'gold', null, null, 100),
  ('Lenda do casal', 'Completar 250 quests diferentes', 'crown', 'platinum', null, null, 250),
  ('Pé na estrada', 'Fazer a primeira viagem', 'plane', 'bronze', 'Viagem', null, 1),
  ('Mochileiros', 'Fazer 5 viagens diferentes', 'backpack', 'silver', 'Viagem', null, 5),
  ('Nômades', 'Fazer 15 viagens diferentes', 'globe', 'gold', 'Viagem', null, 15),
  ('Primeira garfada', 'Visitar o primeiro restaurante', 'utensils', 'bronze', 'Restaurante', null, 1),
  ('Bons de garfo', 'Visitar 10 restaurantes diferentes', 'pizza', 'silver', 'Restaurante', null, 10),
  ('Críticos gastronômicos', 'Visitar 25 restaurantes diferentes', 'chef-hat', 'gold', 'Restaurante', null, 25),
  ('Guia Michelin do casal', 'Visitar 50 restaurantes diferentes', 'award', 'platinum', 'Restaurante', null, 50),
  ('Mãos à obra', 'Completar a primeira atividade', 'target', 'bronze', 'Atividade', null, 1),
  ('Agenda cheia', 'Completar 10 atividades diferentes', 'calendar-check', 'silver', 'Atividade', null, 10),
  ('Inquietos', 'Completar 30 atividades diferentes', 'zap', 'gold', 'Atividade', null, 30),
  ('Pipoca pronta', 'Assistir ao primeiro filme', 'popcorn', 'bronze', 'Filme', null, 1),
  ('Cinéfilos', 'Assistir a 10 filmes diferentes', 'clapperboard', 'silver', 'Filme', null, 10),
  ('Maratona de cinema', 'Assistir a 50 filmes diferentes', 'film', 'gold', 'Filme', null, 50),
  ('Cinemateca', 'Assistir a 100 filmes diferentes', 'landmark', 'platinum', 'Filme', null, 100),
  ('Próximo episódio', 'Terminar a primeira série', 'tv', 'bronze', 'Série', null, 1),
  ('Viciados em séries', 'Terminar 5 séries diferentes', 'sofa', 'silver', 'Série', null, 5),
  ('Só mais um episódio', 'Terminar 15 séries diferentes', 'moon', 'gold', 'Série', null, 15),
  ('Primeiro anime', 'Terminar o primeiro anime', 'sparkles', 'bronze', 'Anime', null, 1),
  ('Otakus', 'Terminar 5 animes diferentes', 'swords', 'silver', 'Anime', null, 5),
  ('Nakama', 'Terminar 20 animes diferentes', 'users', 'gold', 'Anime', null, 20),
  ('Desafio aceito', 'Completar uma quest Difícil ou Épica', 'dumbbell', 'silver', null, 'hard', 1),
  ('Sem medo de desafio', 'Completar 10 quests Difíceis ou Épicas', 'mountain', 'gold', null, 'hard', 10),
  ('Lendários', 'Completar uma quest Épica', 'gem', 'gold', null, 'epic', 1),
  ('Épicos', 'Completar 5 quests Épicas', 'trophy', 'platinum', null, 'epic', 5),
  ('Maratonistas', 'Terminar uma série Épica', 'hourglass', 'platinum', 'Série', 'epic', 1),
  ('Rei dos piratas', 'Terminar um anime Épico', 'anchor', 'platinum', 'Anime', 'epic', 1)
) as a(name, description, icon, rarity, category, min_difficulty, qty)
left join public.categories c on c.name = a.category;

insert into public.achievements (name, description, icon, rarity, kind) values
  ('Nascer do sol juntos', 'Ver o nascer do sol juntos', 'sunrise', 'silver', 'manual'),
  ('Chefs do mundo', 'Cozinhar juntos um prato de outro país', 'cooking-pot', 'bronze', 'manual'),
  ('Acampamento', 'Acampar juntos', 'tent', 'silver', 'manual'),
  ('Na grade', 'Ir ao show do artista favorito', 'mic', 'gold', 'manual'),
  ('Aurora boreal', 'Ver uma aurora boreal juntos', 'moon-star', 'platinum', 'manual');
