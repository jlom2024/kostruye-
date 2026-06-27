-- ============================================================================
-- KREO-PubliCool — SEED DE DATOS DEMO
-- ----------------------------------------------------------------------------
-- Dónde:  Supabase Dashboard → proyecto PubliCool (hfiwflvxogktwsqkitpl)
--         → SQL Editor → New query → pegar TODO → Run
--
-- Qué hace:
--   1. Crea (si no existe) un usuario demo YA CONFIRMADO para iniciar sesión.
--   2. Usa la organización del usuario si ya tiene una; si no, crea una.
--   3. Limpia datos demo previos y siembra: 1 marca, 2 cuentas sociales,
--      4 campañas (2 activas, 1 programada, 1 completada), posts con métricas,
--      métricas diarias por campaña (14 días), ~24 leads y 2 competidores.
--
-- Re-ejecutable: cada corrida limpia y regenera los datos de esa organización.
--
-- Credenciales demo (cámbialas abajo si quieres usar tu propio correo):
--   correo:      demo@publicool.app
--   contraseña:  DemoPubliCool2026
-- ============================================================================

DO $$
DECLARE
  v_email    text := 'demo@publicool.app';     -- <<< tu correo si prefieres
  v_password text := 'DemoPubliCool2026';       -- <<< contraseña del usuario demo
  v_user_id  uuid;
  v_org_id   uuid;
  v_brand_id uuid;
  v_acc_ig   uuid;
  v_acc_fb   uuid;
  v_camp_1   uuid;  -- activa
  v_camp_2   uuid;  -- activa
  v_camp_3   uuid;  -- programada
  v_camp_4   uuid;  -- completada
  v_cv       uuid;
  v_post     uuid;
  v_camp     uuid;
  d          date;
  i          int;
BEGIN
  ----------------------------------------------------------------------------
  -- 1) Usuario auth (crear confirmado si no existe)
  ----------------------------------------------------------------------------
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      v_email, crypt(v_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Comando","company":"KREO IA Studio"}'::jsonb,
      now(), now(),
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id, v_user_id::text,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email', now(), now(), now()
    );
  END IF;

  ----------------------------------------------------------------------------
  -- 2) Organización: usar la del usuario si ya tiene; si no, crear una
  --    (evita que el usuario quede en 2 orgs — getCurrentOrg espera 1)
  ----------------------------------------------------------------------------
  SELECT org_id INTO v_org_id
  FROM organization_members
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, slug, plan)
    VALUES ('KREO IA Studio', 'publicool-demo-' || substr(v_user_id::text, 1, 8), 'pro')
    RETURNING id INTO v_org_id;

    INSERT INTO organization_members (org_id, user_id, role)
    VALUES (v_org_id, v_user_id, 'admin');
  ELSE
    -- asegurar rol admin para poder editar
    UPDATE organization_members SET role = 'admin'
    WHERE org_id = v_org_id AND user_id = v_user_id;
  END IF;

  ----------------------------------------------------------------------------
  -- 3) Limpiar datos demo previos de esta org (cascade vía brands)
  ----------------------------------------------------------------------------
  DELETE FROM brands WHERE org_id = v_org_id;

  ----------------------------------------------------------------------------
  -- 4) Marca
  ----------------------------------------------------------------------------
  INSERT INTO brands (org_id, name, tone, industry, website, colors)
  VALUES (v_org_id, 'Cafetería Luna', 'cercano y juvenil', 'Food & Beverage',
          'https://cafelaluna.pe', ARRAY['#6d28d9', '#f59e0b'])
  RETURNING id INTO v_brand_id;

  ----------------------------------------------------------------------------
  -- 5) Cuentas sociales conectadas (tokens dummy)
  ----------------------------------------------------------------------------
  INSERT INTO social_accounts (brand_id, org_id, network, account_id, username, access_token, followers, profile_url)
  VALUES (v_brand_id, v_org_id, 'instagram', 'ig_demo_001', 'cafelaluna', 'demo-token', 12840, 'https://instagram.com/cafelaluna')
  RETURNING id INTO v_acc_ig;

  INSERT INTO social_accounts (brand_id, org_id, network, account_id, username, access_token, followers, profile_url)
  VALUES (v_brand_id, v_org_id, 'facebook', 'fb_demo_001', 'Cafeteria Luna', 'demo-token', 8210, 'https://facebook.com/cafelaluna')
  RETURNING id INTO v_acc_fb;

  ----------------------------------------------------------------------------
  -- 6) Campañas
  ----------------------------------------------------------------------------
  INSERT INTO campaigns (brand_id, org_id, name, objective, status, networks, start_date, end_date, budget, currency, frequency_per_week, target_audience, created_by)
  VALUES (v_brand_id, v_org_id, 'Lanzamiento Frappés de Verano', 'sales', 'active',
          ARRAY['instagram','facebook']::social_network[], current_date - 10, current_date + 20, 1500, 'PEN', 5,
          'Jóvenes 18-30 en Lima', v_user_id)
  RETURNING id INTO v_camp_1;

  INSERT INTO campaigns (brand_id, org_id, name, objective, status, networks, start_date, end_date, budget, currency, frequency_per_week, target_audience, created_by)
  VALUES (v_brand_id, v_org_id, 'Programa de Fidelidad', 'engagement', 'active',
          ARRAY['instagram']::social_network[], current_date - 25, current_date + 5, 800, 'PEN', 3,
          'Clientes recurrentes', v_user_id)
  RETURNING id INTO v_camp_2;

  INSERT INTO campaigns (brand_id, org_id, name, objective, status, networks, start_date, end_date, budget, currency, frequency_per_week, target_audience, created_by)
  VALUES (v_brand_id, v_org_id, 'Apertura Nueva Sede Miraflores', 'awareness', 'scheduled',
          ARRAY['instagram','facebook','tiktok']::social_network[], current_date + 7, current_date + 37, 3000, 'PEN', 6,
          'Vecinos de Miraflores', v_user_id)
  RETURNING id INTO v_camp_3;

  INSERT INTO campaigns (brand_id, org_id, name, objective, status, networks, start_date, end_date, budget, currency, frequency_per_week, target_audience, created_by)
  VALUES (v_brand_id, v_org_id, 'Campaña Día de la Madre', 'leads', 'completed',
          ARRAY['instagram','facebook']::social_network[], current_date - 60, current_date - 35, 1200, 'PEN', 4,
          'Familias', v_user_id)
  RETURNING id INTO v_camp_4;

  ----------------------------------------------------------------------------
  -- 7) Contenido + posts publicados + métricas (campañas activas)
  ----------------------------------------------------------------------------
  FOR i IN 1..8 LOOP
    v_camp := CASE WHEN i % 2 = 0 THEN v_camp_2 ELSE v_camp_1 END;

    INSERT INTO content_variants (campaign_id, network, format, copy, hook, cta, hashtags, ai_generated, approved)
    VALUES (v_camp, 'instagram', 'reel',
            'Disfruta nuestro nuevo frappé #' || i || ' — cremoso, frío y perfecto para el verano limeño.',
            '¿Calor? Tenemos la solución 🧊', 'Pídelo hoy en tienda',
            ARRAY['#cafe','#verano','#lima','#frappe'], true, true)
    RETURNING id INTO v_cv;

    INSERT INTO posts (campaign_id, brand_id, social_account_id, content_variant_id, network, format, copy, hashtags, status, scheduled_at, published_at)
    VALUES (v_camp, v_brand_id, v_acc_ig, v_cv, 'instagram', 'reel',
            'Disfruta nuestro nuevo frappé #' || i, ARRAY['#cafe','#verano'],
            'published', now() - (i || ' days')::interval, now() - (i || ' days')::interval)
    RETURNING id INTO v_post;

    INSERT INTO post_metrics (post_id, reach, impressions, likes, comments, shares, saves, clicks, ctr, conversions)
    VALUES (v_post,
            900 + floor(random()*1500)::int,
            1600 + floor(random()*2800)::int,
            80 + floor(random()*420)::int,
            5 + floor(random()*60)::int,
            2 + floor(random()*40)::int,
            10 + floor(random()*120)::int,
            30 + floor(random()*180)::int,
            round((0.01 + random()*0.05)::numeric, 4),
            1 + floor(random()*18)::int);
  END LOOP;

  ----------------------------------------------------------------------------
  -- 8) Métricas diarias por campaña — últimos 14 días (para gráficos)
  ----------------------------------------------------------------------------
  FOR d IN SELECT generate_series(current_date - 13, current_date, interval '1 day')::date LOOP
    FOREACH v_camp IN ARRAY ARRAY[v_camp_1, v_camp_2] LOOP
      INSERT INTO campaign_metrics (campaign_id, date, total_reach, total_impressions, total_engagement, total_clicks, total_conversions, total_leads, spend)
      VALUES (v_camp, d,
              800 + floor(random()*1400)::int,
              1500 + floor(random()*2600)::int,
              120 + floor(random()*320)::int,
              40 + floor(random()*170)::int,
              3 + floor(random()*16)::int,
              2 + floor(random()*9)::int,
              round((40 + random()*70)::numeric, 2))
      ON CONFLICT (campaign_id, date) DO NOTHING;
    END LOOP;
  END LOOP;

  ----------------------------------------------------------------------------
  -- 9) Formulario de leads + leads capturados
  ----------------------------------------------------------------------------
  INSERT INTO lead_forms (campaign_id, brand_id, org_id, name, fields, slug, active)
  VALUES (v_camp_4, v_brand_id, v_org_id, 'Promo Día de la Madre',
          '[{"name":"nombre","type":"text"},{"name":"email","type":"email"},{"name":"telefono","type":"tel"}]'::jsonb,
          'promo-dia-madre-' || substr(v_org_id::text, 1, 8), true);

  FOR i IN 1..24 LOOP
    INSERT INTO leads (campaign_id, brand_id, org_id, name, email, phone, source, utm_source, utm_medium, utm_campaign, created_at)
    VALUES (
      CASE WHEN i % 3 = 0 THEN v_camp_4 WHEN i % 3 = 1 THEN v_camp_1 ELSE v_camp_2 END,
      v_brand_id, v_org_id,
      'Lead ' || i,
      'lead' || i || '@example.com',
      '+519' || lpad((10000000 + floor(random()*89999999)::int)::text, 8, '0'),
      'instagram', 'instagram', 'social', 'verano',
      now() - (floor(random()*20) || ' days')::interval
    );
  END LOOP;

  ----------------------------------------------------------------------------
  -- 10) Competidores (benchmark)
  ----------------------------------------------------------------------------
  INSERT INTO competitors (brand_id, org_id, name, network, username, followers, avg_engagement, profile_url, last_analyzed_at)
  VALUES
    (v_brand_id, v_org_id, 'Starbucks Perú', 'instagram', 'starbuckspe', 285000, 0.018, 'https://instagram.com/starbuckspe', now() - interval '2 days'),
    (v_brand_id, v_org_id, 'Juan Valdez Perú', 'instagram', 'juanvaldezpe', 142000, 0.022, 'https://instagram.com/juanvaldezpe', now() - interval '2 days');

  RAISE NOTICE '✅ Seed completo. Org: %  ·  Usuario: %  ·  Pass: %', v_org_id, v_email, v_password;
END $$;
