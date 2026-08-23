-- Ajoute le numéro de décision du cabinet aux informations reprises
-- sur les factures / bordereaux.

ALTER TABLE cabinet ADD COLUMN numero_decision TEXT NOT NULL DEFAULT '';
