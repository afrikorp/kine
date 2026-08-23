-- KINE.CNAM — schéma initial D1 (SQLite)
-- Aucune migration de données de l'ancien logiciel : l'app démarre à vide.
-- Un seul cabinet / praticien, pas de multi-tenant.

PRAGMA foreign_keys = ON;

-- ============================================================
-- Cabinet (singleton) — infos reprises sur les factures / bordereaux
-- ============================================================
CREATE TABLE cabinet (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  nom TEXT NOT NULL,
  adresse TEXT NOT NULL DEFAULT '',
  telephone TEXT NOT NULL DEFAULT '',
  rc TEXT NOT NULL DEFAULT '',
  matricule_fiscal TEXT NOT NULL DEFAULT '',
  rib TEXT NOT NULL DEFAULT '',
  code_cnam_praticien TEXT NOT NULL DEFAULT '', -- ex "29875"
  cle_cnam_praticien TEXT NOT NULL DEFAULT '',  -- ex "96"
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TRIGGER trg_cabinet_updated_at
AFTER UPDATE ON cabinet
BEGIN
  UPDATE cabinet SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ============================================================
-- Utilisateurs — auth simple utilisateur/mot de passe, un seul praticien
-- (les sessions elles-mêmes sont gérées côté Workers via KV, pas ici)
-- ============================================================
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- Paramètres tarifaires historisés (prix unitaire de la séance + taux
-- de TVA). Une nouvelle ligne est ajoutée à chaque changement de tarif.
-- Les factures stockent un instantané de ces valeurs à leur création et
-- ne sont jamais recalculées rétroactivement si le tarif change ensuite.
-- ============================================================
CREATE TABLE parametres_tarif (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prix_unitaire REAL NOT NULL,
  taux_tva REAL NOT NULL,
  date_effet TEXT NOT NULL, -- ISO AAAA-MM-JJ : date à partir de laquelle ce tarif s'applique
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_parametres_tarif_date_effet ON parametres_tarif(date_effet);

-- ============================================================
-- Jours fériés tunisiens — liste modifiable manuellement chaque année.
-- Pas de calcul automatique des fêtes religieuses mobiles (Aïd, etc.) :
-- l'utilisateur les ajoute lui-même une fois les dates connues.
-- ============================================================
CREATE TABLE jours_feries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE, -- ISO AAAA-MM-JJ
  libelle TEXT NOT NULL
);

-- ============================================================
-- Patients
-- ============================================================
CREATE TABLE patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  -- n° assuré CNAM, format "racine/clé" (ex "9875710/0") stocké en 2 champs
  numero_assure_racine TEXT NOT NULL,
  numero_assure_cle TEXT NOT NULL,
  qualite_beneficiaire TEXT NOT NULL CHECK (qualite_beneficiaire IN (
    'assure', 'conjoint', 'enfant', 'ascendant', 'autre'
  )),
  telephone TEXT NOT NULL DEFAULT '',
  adresse TEXT NOT NULL DEFAULT '',
  date_naissance TEXT, -- ISO AAAA-MM-JJ, optionnel
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_patients_nom ON patients(nom, prenom);
CREATE INDEX idx_patients_numero_assure ON patients(numero_assure_racine, numero_assure_cle);

CREATE TRIGGER trg_patients_updated_at
AFTER UPDATE ON patients
BEGIN
  UPDATE patients SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ============================================================
-- Décisions de prise en charge CNAM — format "bureau/année/n°ordre"
-- (ex "40/2025/13819"). Une décision peut couvrir plusieurs factures
-- (ex si le traitement est facturé en plusieurs fois).
-- ============================================================
CREATE TABLE decisions_cnam (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  bureau TEXT NOT NULL,          -- 2 chiffres, ex "40"
  annee INTEGER NOT NULL,        -- année de la décision
  numero_ordre INTEGER NOT NULL, -- n° d'ordre, ex 13819
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_decisions_cnam_unique ON decisions_cnam(bureau, annee, numero_ordre);
CREATE INDEX idx_decisions_cnam_patient ON decisions_cnam(patient_id);

-- ============================================================
-- Bordereaux de transmission CNAM — format "n°/année" (ex "017/2024")
-- ============================================================
CREATE TABLE bordereaux (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero INTEGER NOT NULL,
  annee INTEGER NOT NULL,
  date_creation TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_bordereaux_numero_annee ON bordereaux(numero, annee);

-- ============================================================
-- Factures
-- ============================================================
CREATE TABLE factures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero INTEGER NOT NULL,
  annee_facture INTEGER NOT NULL,
  decision_id INTEGER NOT NULL REFERENCES decisions_cnam(id),
  date_debut TEXT NOT NULL, -- ISO AAAA-MM-JJ, début de la plage de séances
  date_fin TEXT NOT NULL,   -- ISO AAAA-MM-JJ, fin de la plage de séances
  nb_seances INTEGER NOT NULL CHECK (nb_seances > 0),
  -- Rythme de séances/semaine : saisi explicitement par l'utilisateur à la
  -- création de la facture, jamais recalculé à partir des dates (cf. le
  -- module @kine/cnam-format qui l'utilise tel quel pour le fichier CNAM).
  seances_par_semaine INTEGER NOT NULL CHECK (seances_par_semaine IN (2, 3, 4)),
  prestation TEXT NOT NULL DEFAULT '75', -- code prestation CNAM (kinésithérapie)
  -- Instantané des paramètres tarifaires au moment de la création :
  -- si le tarif change ensuite, cette facture garde ses propres valeurs.
  prix_unitaire REAL NOT NULL,
  taux_tva REAL NOT NULL,
  montant_ttc REAL NOT NULL,
  montant_ht REAL NOT NULL,
  montant_tva REAL NOT NULL,
  date_edition TEXT NOT NULL, -- ISO AAAA-MM-JJ, date d'édition/impression
  bordereau_id INTEGER REFERENCES bordereaux(id), -- NULL tant que non transmise
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_factures_numero_annee ON factures(numero, annee_facture);
CREATE INDEX idx_factures_decision ON factures(decision_id);
CREATE INDEX idx_factures_bordereau ON factures(bordereau_id);

CREATE TRIGGER trg_factures_updated_at
AFTER UPDATE ON factures
BEGIN
  UPDATE factures SET updated_at = datetime('now') WHERE id = NEW.id;
END;
