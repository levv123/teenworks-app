-- ============================================================
-- LastMinute Marketplace - Seed Data
-- ============================================================

-- Insert categories
INSERT INTO public.categories (id, name, icon, description, color) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Cleaning', 'sparkles', 'Home and office cleaning services', '#6C47FF'),
  ('c1000000-0000-0000-0000-000000000002', 'Plumbing', 'water', 'Pipe repairs, installations, leaks', '#3B82F6'),
  ('c1000000-0000-0000-0000-000000000003', 'Electrical', 'flash', 'Wiring, outlets, fixtures', '#F59E0B'),
  ('c1000000-0000-0000-0000-000000000004', 'Moving', 'cube', 'Help moving furniture and boxes', '#10B981'),
  ('c1000000-0000-0000-0000-000000000005', 'Handyman', 'hammer', 'General repairs and odd jobs', '#FF6B35'),
  ('c1000000-0000-0000-0000-000000000006', 'Delivery', 'bicycle', 'Package pickup and delivery', '#EC4899'),
  ('c1000000-0000-0000-0000-000000000007', 'Tutoring', 'book', 'Academic and skill tutoring', '#8B5CF6'),
  ('c1000000-0000-0000-0000-000000000008', 'Pet Care', 'paw', 'Dog walking, pet sitting', '#14B8A6')
ON CONFLICT (name) DO NOTHING;

-- Note: In a real setup, you'd create test users via Supabase Auth API
-- and then insert their profiles. The UUIDs below are placeholders
-- that match what you'd get from auth.users after creating test accounts.

-- Sample profiles (run these AFTER creating users via Auth)
-- INSERT INTO public.profiles (user_id, full_name, avatar_url, phone, role, location_lat, location_lng)
-- VALUES
--   ('usr00001-0000-0000-0000-000000000001', 'Alex Johnson', 'https://i.pravatar.cc/150?img=1', '+1-555-0101', 'client', 40.7128, -74.0060),
--   ('usr00001-0000-0000-0000-000000000002', 'Sarah Chen', 'https://i.pravatar.cc/150?img=5', '+1-555-0102', 'provider', 40.7189, -74.0020),
--   ('usr00001-0000-0000-0000-000000000003', 'Marcus Williams', 'https://i.pravatar.cc/150?img=3', '+1-555-0103', 'provider', 40.7220, -73.9980);

-- Sample provider profiles (run after profiles)
-- INSERT INTO public.provider_profiles (user_id, bio, skills, hourly_rate, rating, review_count, is_available, radius_km)
-- VALUES
--   ('usr00001-0000-0000-0000-000000000002', 'Professional cleaner with 5 years experience. Eco-friendly products only.', ARRAY['Cleaning','Organizing','Laundry'], 35.00, 4.8, 42, true, 15),
--   ('usr00001-0000-0000-0000-000000000003', 'Licensed plumber and handyman. Fast response, quality work guaranteed.', ARRAY['Plumbing','Handyman','Electrical'], 65.00, 4.6, 28, true, 20);
