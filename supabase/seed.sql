-- Insert demo app users
insert into app_users (id, email, role) values 
  ('11111111-1111-1111-1111-111111111111', 'admin@toursafe.app', 'ADMIN'),
  ('22222222-2222-2222-2222-222222222222', 'operator@toursafe.app', 'OPERATOR');

-- Insert demo tourists with placeholder VCs
insert into tourists (id, display_name, vc_jwt, vc_sha256, emergency_contact, lang) values
  (
    '33333333-3333-3333-3333-333333333333',
    'Alice Tourist',
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJkaWQ6d2ViOnRvdXJzYWZlLmFwcCIsInN1YiI6ImRpZDp0b3VyaXN0OmFsaWNlIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE5NTYzNTUyMDAsInZjIjp7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIl0sInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiLCJUb3VyaXN0SWRlbnRpdHlDcmVkZW50aWFsIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImlkIjoiZGlkOnRvdXJpc3Q6YWxpY2UiLCJkaXNwbGF5TmFtZSI6IkFsaWNlIFRvdXJpc3QifX19.placeholder_signature_alice',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    '+1234567890',
    'en'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'Bob Explorer',
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJkaWQ6d2ViOnRvdXJzYWZlLmFwcCIsInN1YiI6ImRpZDp0b3VyaXN0OmJvYiIsImlhdCI6MTY0MDk5NTIwMCwiZXhwIjoxOTU2MzU1MjAwLCJ2YyI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSJdLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiVG91cmlzdElkZW50aXR5Q3JlZGVudGlhbCJdLCJjcmVkZW50aWFsU3ViamVjdCI6eyJpZCI6ImRpZDp0b3VyaXN0OmJvYiIsImRpc3BsYXlOYW1lIjoiQm9iIEV4cGxvcmVyIn19fQ.placeholder_signature_bob',
    'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
    '+9876543210',
    'hi'
  );

-- Insert demo zones covering different areas
-- Zone 1: Safe zone (Tourist area in Mumbai - around Gateway of India)
insert into zones (id, name, type, polygon_geojson, created_by) values
(
  '55555555-5555-5555-5555-555555555555',
  'Gateway of India Safe Zone',
  'SAFE',
  '{
    "type": "MultiPolygon",
    "coordinates": [[[[72.8347, 18.9220], [72.8360, 18.9220], [72.8360, 18.9200], [72.8347, 18.9200], [72.8347, 18.9220]]]]
  }'::jsonb,
  '11111111-1111-1111-1111-111111111111'
),
-- Zone 2: Restricted zone (High security area)
(
  '66666666-6666-6666-6666-666666666666',
  'Naval Restricted Area',
  'RESTRICTED',
  '{
    "type": "MultiPolygon",
    "coordinates": [[[[72.8370, 18.9250], [72.8390, 18.9250], [72.8390, 18.9230], [72.8370, 18.9230], [72.8370, 18.9250]]]]
  }'::jsonb,
  '11111111-1111-1111-1111-111111111111'
),
-- Zone 3: Alert zone (Crowded market area requiring caution)
(
  '77777777-7777-7777-7777-777777777777',
  'Crawford Market Alert Zone',
  'ALERT',
  '{
    "type": "MultiPolygon",
    "coordinates": [[[[72.8310, 18.9480], [72.8330, 18.9480], [72.8330, 18.9460], [72.8310, 18.9460], [72.8310, 18.9480]]]]
  }'::jsonb,
  '11111111-1111-1111-1111-111111111111'
);

-- Insert some demo pings for Alice (tourist in safe zone)
insert into pings (tourist_id, ts, lat, lng, speed, bearing) values
  ('33333333-3333-3333-3333-333333333333', now() - interval '5 minutes', 18.9210, 72.8350, 1.2, 45),
  ('33333333-3333-3333-3333-333333333333', now() - interval '4 minutes', 18.9212, 72.8352, 1.1, 50),
  ('33333333-3333-3333-3333-333333333333', now() - interval '3 minutes', 18.9214, 72.8354, 0.8, 55),
  ('33333333-3333-3333-3333-333333333333', now() - interval '2 minutes', 18.9216, 72.8356, 1.0, 60),
  ('33333333-3333-3333-3333-333333333333', now() - interval '1 minute', 18.9218, 72.8358, 1.3, 65);

-- Insert some demo pings for Bob (tourist moving toward restricted zone)
insert into pings (tourist_id, ts, lat, lng, speed, bearing) values
  ('44444444-4444-4444-4444-444444444444', now() - interval '5 minutes', 18.9240, 72.8365, 2.1, 90),
  ('44444444-4444-4444-4444-444444444444', now() - interval '4 minutes', 18.9242, 72.8368, 2.0, 88),
  ('44444444-4444-4444-4444-444444444444', now() - interval '3 minutes', 18.9244, 72.8372, 1.9, 85),
  ('44444444-4444-4444-4444-444444444444', now() - interval '2 minutes', 18.9246, 72.8375, 1.8, 82),
  ('44444444-4444-4444-4444-444444444444', now() - interval '1 minute', 18.9248, 72.8378, 1.7, 80);

-- Insert a demo incident (Bob approaching restricted zone)
insert into incidents (id, tourist_id, type, severity, ts, lat, lng, status, meta) values
(
  '88888888-8888-8888-8888-888888888888',
  '44444444-4444-4444-4444-444444444444',
  'RESTRICTED',
  'MEDIUM',
  now() - interval '30 seconds',
  18.9248,
  72.8378,
  'OPEN',
  '{"zone_id": "66666666-6666-6666-6666-666666666666", "zone_name": "Naval Restricted Area", "auto_generated": true}'::jsonb
);

-- Insert demo device tokens
insert into device_tokens (tourist_id, token, platform) values
  ('33333333-3333-3333-3333-333333333333', 'demo_token_alice_web', 'web'),
  ('44444444-4444-4444-4444-444444444444', 'demo_token_bob_web', 'web');

insert into device_tokens (user_id, token, platform) values
  ('11111111-1111-1111-1111-111111111111', 'demo_token_admin_web', 'web'),
  ('22222222-2222-2222-2222-222222222222', 'demo_token_operator_web', 'web');
