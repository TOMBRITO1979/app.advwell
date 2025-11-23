-- Create AdvWell Platform Management Company
INSERT INTO companies (id, name, email, active, "apiKey", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'AdvWell Platform Management',
  'appadvwell@gmail.com',
  true,
  gen_random_uuid()::text,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  "apiKey" = gen_random_uuid()::text,
  "updatedAt" = NOW()
RETURNING id, name, email;

-- Create SUPER_ADMIN user
-- Password: Contadeva123! (hashed with bcrypt factor 10)
-- Hash: $2b$10$Mg.T0RALHD.6vXoVAhzmu.xyWC4zcJ/79ikyoqwGIkBz3QuybZ1gW
INSERT INTO users (id, email, password, name, role, "companyId", active, "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  'appadvwell@gmail.com',
  '$2b$10$Mg.T0RALHD.6vXoVAhzmu.xyWC4zcJ/79ikyoqwGIkBz3QuybZ1gW',
  'Super Admin - AdvWell',
  'SUPER_ADMIN',
  c.id,
  true,
  NOW(),
  NOW()
FROM companies c
WHERE c.email = 'appadvwell@gmail.com'
ON CONFLICT (email) DO UPDATE SET
  password = '$2b$10$Mg.T0RALHD.6vXoVAhzmu.xyWC4zcJ/79ikyoqwGIkBz3QuybZ1gW',
  role = 'SUPER_ADMIN',
  active = true,
  "updatedAt" = NOW()
RETURNING id, email, name, role;
