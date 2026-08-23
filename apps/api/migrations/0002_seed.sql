-- Données de bootstrap (pas une migration de l'ancien logiciel) :
-- - le tarif actuellement en vigueur (prix unitaire 11,500 DT / TVA 7%)
-- - les jours fériés tunisiens à date fixe (calendrier grégorien)
-- Les fêtes religieuses mobiles (Aïd el-Fitr, Aïd el-Idha, Mouled, Ras
-- Sana hijri, etc.) ne sont PAS incluses : à ajouter manuellement chaque
-- année dans l'écran Paramètres dès que les dates sont publiées.

INSERT INTO parametres_tarif (prix_unitaire, taux_tva, date_effet)
VALUES (11.5, 7, '2020-01-01');

INSERT INTO jours_feries (date, libelle) VALUES
  ('2025-01-01', 'Jour de l''An'),
  ('2025-01-14', 'Fête de la Révolution et de la Jeunesse'),
  ('2025-03-20', 'Fête de l''Indépendance'),
  ('2025-04-09', 'Jour des Martyrs'),
  ('2025-05-01', 'Fête du Travail'),
  ('2025-07-25', 'Fête de la République'),
  ('2025-08-13', 'Fête de la Femme'),
  ('2025-10-15', 'Fête de l''Évacuation'),
  ('2026-01-01', 'Jour de l''An'),
  ('2026-01-14', 'Fête de la Révolution et de la Jeunesse'),
  ('2026-03-20', 'Fête de l''Indépendance'),
  ('2026-04-09', 'Jour des Martyrs'),
  ('2026-05-01', 'Fête du Travail'),
  ('2026-07-25', 'Fête de la République'),
  ('2026-08-13', 'Fête de la Femme'),
  ('2026-10-15', 'Fête de l''Évacuation'),
  ('2027-01-01', 'Jour de l''An'),
  ('2027-01-14', 'Fête de la Révolution et de la Jeunesse'),
  ('2027-03-20', 'Fête de l''Indépendance'),
  ('2027-04-09', 'Jour des Martyrs'),
  ('2027-05-01', 'Fête du Travail'),
  ('2027-07-25', 'Fête de la République'),
  ('2027-08-13', 'Fête de la Femme'),
  ('2027-10-15', 'Fête de l''Évacuation');
