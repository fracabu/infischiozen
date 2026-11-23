-- ============================================================================
-- Schema di infischiozen — Postgres su Neon. Un database per ogni partita
-- IVA: i dati del cedente sono uno solo per database.
--
-- Applica con:  npm run db:schema      (idempotente: si puo' rilanciare)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ANAGRAFICA FISCALE DEI CLIENTI
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clienti_fiscali (
    id                  SERIAL PRIMARY KEY,
    -- tipo: privato | azienda | pa
    tipo                TEXT NOT NULL DEFAULT 'privato',
    -- FatturaPA vuole nome e cognome SEPARATI per le persone fisiche.
    nome                TEXT,
    cognome             TEXT,
    denominazione       TEXT,           -- ragione sociale, per aziende/PA
    nome_completo       TEXT NOT NULL,  -- come stampato sulla fattura
    codice_fiscale      TEXT,
    partita_iva         TEXT,
    email               TEXT,
    indirizzo           TEXT,
    cap                 TEXT,
    citta               TEXT,
    provincia           TEXT,
    nazione             TEXT NOT NULL DEFAULT 'IT',
    -- '0000000' = niente canale telematico: la fattura resta a disposizione
    -- nel cassetto fiscale del cliente.
    codice_destinatario TEXT NOT NULL DEFAULT '0000000',
    pec                 TEXT,
    telefono            TEXT,
    note                TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS clienti_fiscali_cf_uq
    ON clienti_fiscali (UPPER(codice_fiscale))
    WHERE codice_fiscale IS NOT NULL AND codice_fiscale <> '';
CREATE UNIQUE INDEX IF NOT EXISTS clienti_fiscali_piva_uq
    ON clienti_fiscali (partita_iva)
    WHERE partita_iva IS NOT NULL AND partita_iva <> '';
CREATE INDEX IF NOT EXISTS clienti_fiscali_email_idx
    ON clienti_fiscali (LOWER(email));

-- ---------------------------------------------------------------------------
-- FATTURE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fatture (
    id                  SERIAL PRIMARY KEY,
    -- numero e anno restano NULL finche' la fattura e' una bozza: il numero si
    -- assegna solo all'emissione, cosi' una bozza cancellata non lascia buchi.
    numero              INT,
    anno                INT,
    -- '12/2026' per le emesse, 'bozza-<uuid>' per le bozze.
    numero_fattura      TEXT NOT NULL,
    data_emissione      DATE NOT NULL,
    cliente_id          INT REFERENCES clienti_fiscali(id) ON DELETE RESTRICT,
    -- Fotografia dell'anagrafica al momento dell'emissione: se il cliente
    -- cambia indirizzo, la fattura gia' emessa NON deve cambiare.
    cliente_snapshot    JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- righe: [{prodottoId, descrizione, quantita, prezzoUnitario, totaleRiga}]
    righe               JSONB NOT NULL DEFAULT '[]'::jsonb,
    imponibile          NUMERIC(10,2) NOT NULL DEFAULT 0,
    -- Scelta dell'utente ("su questa fattura niente rivalsa"): una rivalsa di
    -- 0 EUR da sola non dice se e' stata esclusa o non era dovuta.
    applica_rivalsa     BOOLEAN NOT NULL DEFAULT true,
    rivalsa_inps        NUMERIC(10,2) NOT NULL DEFAULT 0,
    percentuale_rivalsa NUMERIC(5,2)  NOT NULL DEFAULT 0,
    marca_da_bollo      NUMERIC(10,2) NOT NULL DEFAULT 0,
    totale              NUMERIC(10,2) NOT NULL DEFAULT 0,
    stato               TEXT NOT NULL DEFAULT 'bozza'
        CHECK (stato IN ('bozza', 'emessa', 'inviata', 'pagata', 'annullata')),
    -- interna = emessa da qui; esterna = emessa con un altro software e
    -- registrata solo per il fatturato (con il suo numero).
    origine             TEXT NOT NULL DEFAULT 'interna'
        CHECK (origine IN ('interna', 'esterna')),
    modalita_pagamento  TEXT,
    scadenza_pagamento  DATE,
    file_pdf            TEXT,
    pdf_esterno         BYTEA,          -- PDF della fattura esterna, allegato a mano
    xml_sdi             TEXT,           -- XML FatturaPA, quando generato
    note                TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Una fattura non in bozza ha sempre numero e anno.
    CONSTRAINT fatture_numerata_se_emessa
        CHECK (stato = 'bozza' OR stato = 'annullata' OR (numero IS NOT NULL AND anno IS NOT NULL))
);

-- La numerazione e' progressiva e non ripetibile: il DB lo impone.
CREATE UNIQUE INDEX IF NOT EXISTS fatture_numero_anno_uq ON fatture (anno, numero);
CREATE UNIQUE INDEX IF NOT EXISTS fatture_numero_fattura_uq ON fatture (numero_fattura);
CREATE INDEX IF NOT EXISTS fatture_data_idx    ON fatture (data_emissione DESC);
CREATE INDEX IF NOT EXISTS fatture_cliente_idx ON fatture (cliente_id);

-- ---------------------------------------------------------------------------
-- CATALOGO PRODOTTI / SERVIZI
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prodotti (
    id            SERIAL PRIMARY KEY,
    nome          TEXT NOT NULL,
    categoria     TEXT,
    unita_misura  TEXT,
    prezzo        NUMERIC(10,2) NOT NULL DEFAULT 0,
    descrizione   TEXT,
    attivo        BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS prodotti_nome_uq ON prodotti (LOWER(nome));

-- ---------------------------------------------------------------------------
-- IMPOSTAZIONI DEL CEDENTE (riga unica)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS impostazioni (
    id          INT PRIMARY KEY DEFAULT 1,
    dati        JSONB NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Due righe qui vorrebbero dire fatture emesse con partite IVA diverse.
    CONSTRAINT impostazioni_riga_unica CHECK (id = 1)
);
