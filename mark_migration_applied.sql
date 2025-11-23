INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
  gen_random_uuid()::text,
  '',
  NOW(),
  '20250122000000_add_person_type',
  NULL,
  NULL,
  NOW(),
  1
)
ON CONFLICT DO NOTHING;
