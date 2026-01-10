-- Neuen Benutzer in auth.users anlegen
-- 1. Erstelle eine ID für den Benutzer
DO $$
DECLARE
  uid UUID := '87348a9f-513c-463d-82eb-89b883d4ddc6';
  user_email TEXT := 'mickyfurrer@outlook.com';
  hashed_password TEXT := '$2a$10$iF7SRTJ.38QDM/vjtZpiOeVKFUotZz4LqB6ZcSyoOIqvwckACYGBy';
BEGIN
  -- 2. Eintrag in auth.users (Der Haupt-Account)
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, 
    email_confirmed_at, recovery_sent_at, last_sign_in_at, 
    raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at, confirmation_token, 
    email_change, email_change_token_new, recovery_token,
    role, aud
  ) VALUES (
    uid, '00000000-0000-0000-0000-000000000000', user_email, hashed_password,
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{"full_name": "Micky"}',
    now(), now(), '', '', '', '',
    'authenticated', 'authenticated'
  );

  -- 3. Eintrag in auth.identities 
  -- WICHTIG: Ohne diesen Eintrag erkennt Supabase den User nicht beim Login!
  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider, 
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), uid, uid, 
    format('{"sub":"%s", "email":"%s"}', uid, user_email)::jsonb, 
    'email', now(), now(), now()
  );

  -- Optional: Ausgabe der ID, um sie für deine 'wines' Tabelle zu nutzen
  RAISE NOTICE 'Benutzer angelegt mit ID: %', uid;

  -- Hinweis: Marktpreise aus dem PDF wurden als 'price' übernommen, sofern kein Kaufpreis vorhanden war.
  INSERT INTO wines (user_id, name, vintage, quantity, price, bottle_size) VALUES
  (uid, 'Weingut Steiner Sauvignon Blanc', 2023, 3, NULL, '75cl'),
  (uid, 'Ansitz Waldgries Mirell', 2017, 1, 55.30, '75cl'),
  (uid, 'SCHRECKBICHL COLTERENZIO Sauvignon Blanc Gran Lafóa', 2021, 1, 88.80, '75cl'),
  (uid, 'Montes Purple Angel', 2020, 1, 73.51, '150cl'),
  (uid, 'Cantina Kurtatsch Soma Merlot - Cabernet', 2019, 2, 33.51, '75cl'),
  (uid, 'Weingut Stiner Cuvée Merlot Weiss', 2023, 6, NULL, '75cl'),
  (uid, 'Adrian & Diego Mathier Nouveau Salquenen Ag Les Pyramides Humagne Blanc', 2024, 3, NULL, '75cl'),
  (uid, 'Bolero Marsanne Blanche', 2019, 1, NULL, '75cl'),
  (uid, 'Cline Family Cellars Ancient Vines Mourvèdre', 2023, 4, NULL, '75cl'),
  (uid, 'Nine Hats Nine Hats Syrah', 2017, 2, 31.72, '75cl'),
  (uid, 'Adrian et Diego Mathier Viognier Les Pyramides', 2024, 3, NULL, '75cl'),
  (uid, 'Ruinart Blanc De Blancs', NULL, 1, 86.00, '75cl'),
  (uid, 'Orin Swift Papillon', 2016, 1, 107.02, '75cl'),
  (uid, 'Jean-luc Thunevin Bad Boy L''original', 2002, 1, NULL, '75cl'),
  (uid, 'Galardi Terra di Lavoro', 2018, 1, 60.54, '75cl'),
  (uid, 'Hauksson Weine Alpberg Pinot Noir', 2019, 1, NULL, '75cl'),
  (uid, 'Oskar Mathier-Oggier AG Petit Gigolo Fendant', NULL, 5, NULL, '75cl'),
  (uid, 'Adrian Et Diego Mathier Ambassadeur Fumé', 2024, 3, NULL, '75cl'),
  (uid, 'Hauksson Sólskin Pinot Noir', 2019, 2, 27.02, '37.5cl'),
  (uid, 'Viña Vik Winery VIK', 2012, 1, 123.94, '150cl'),
  (uid, 'Palacios Remondo Rioja Reserva Selección Especial La Montesa', 2015, 3, 23.54, '75cl'),
  (uid, 'Adrian et Diego Mathier L''Ambassadeur des Domaines Diego Mathier Red', 2023, 3, 43.24, '75cl'),
  (uid, 'Ansitz Waldgries Riserva Lagrein', 2016, 1, 30.81, '75cl'),
  (uid, 'Valquejigoso V2', 2010, 1, NULL, '75cl'),
  (uid, 'Kellerei Meran Segen Lagrein Riserva', 2020, 1, 37.84, '75cl'),
  (uid, 'Salentein Numina Gran Corte', 2019, 1, 32.43, '150cl'),
  (uid, 'Pacheca Douro Vale de Abraão Tinto', 2016, 1, 75.12, '75cl'),
  (uid, 'Ansitz Waldgries Roblinus De'' Waldgries', 2016, 1, 100.00, '150cl'),
  (uid, 'Viña Vik Winery Milla Cala', 2014, 1, 27.19, '75cl'),
  (uid, 'Adrian & diego mathier nouveau salquenen Thelygenie Valsar Rouge', 2021, 1, NULL, '75cl'),
  (uid, 'Kellerei Terlan Quarz', 2021, 1, NULL, '75cl'),
  (uid, 'Adrian & Diego Mathier Dôle Blanche Frauenfreude', 2024, 3, 18.92, '75cl'),
  (uid, 'Wagner Vineyards Vignoles', 2022, 6, 27.02, '37.5cl'),
  (uid, 'Nine Hats Cellars Nine Hats Riesling', 2023, 6, NULL, '75cl'),
  (uid, 'Le Vigne di Sammarco Salice Salentino', 2015, 2, 10.09, '75cl'),
  (uid, 'Kellerei Meran Saperaia', 2020, 1, NULL, '75cl'),
  (uid, 'Adrian & Diego Mathier Humagne Rouge', 2020, 3, NULL, '75cl'),
  (uid, 'Ritterhof Crescendo Perlhofer', 2016, 2, 11.60, '75cl'),
  (uid, 'Donnafugata Cuordilava Dolce & Gabbana Rosso', 2019, 1, 74.59, '75cl'),
  (uid, 'Viña Vik Winery VIK', 2012, 1, 247.88, '300cl'),
  (uid, 'Viña Vik Winery La Piu Belle', 2011, 2, 51.26, '75cl'),
  (uid, 'Banfi Brunello Di Montalcino', 2018, 1, 77.83, '150cl'),
  (uid, 'Manincor Cassiano', 2019, 1, 38.56, '75cl'),
  (uid, 'Mark Ryan Winery Monkey Wrench', 2022, 6, NULL, '75cl'),
  (uid, 'Domaine de la Pertuisane Le Nain Violet Grenache', 2019, 1, 28.25, '75cl'),
  (uid, 'Elena Walch Cuvée Kermesse Rosso', 2010, 1, 62.16, '150cl'),
  (uid, 'Adrian & Diego Mathier Nouveau Salquenen Folissimo', 2022, 3, 104.86, '75cl'),
  (uid, 'Adrian et Diego Mathier L''Ambassadeur des Domaines Diego Mathier Red', 2020, 2, 43.24, '75cl'),
  (uid, 'Muri-Gries Lagrein Südtirol', 2022, 2, 18.70, '75cl');

END $$;
