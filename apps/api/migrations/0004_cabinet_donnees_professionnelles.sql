-- Complète les informations du cabinet pour se rapprocher de l'écran
-- « Paramétrage » de l'ancien logiciel : spécialité, banque, et le bloc
-- Données Professionnelles (type, code prestation, employeur).

ALTER TABLE cabinet ADD COLUMN specialite TEXT NOT NULL DEFAULT '';
ALTER TABLE cabinet ADD COLUMN banque TEXT NOT NULL DEFAULT '';
ALTER TABLE cabinet ADD COLUMN type_praticien TEXT NOT NULL DEFAULT '';
ALTER TABLE cabinet ADD COLUMN code_prestation TEXT NOT NULL DEFAULT '75';
ALTER TABLE cabinet ADD COLUMN code_employeur TEXT NOT NULL DEFAULT '';
ALTER TABLE cabinet ADD COLUMN cle_employeur TEXT NOT NULL DEFAULT '';
