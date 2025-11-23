SELECT 
  u.email,
  u.name,
  u.role,
  u.active,
  c.name as company_name,
  (SELECT COUNT(*) FROM users WHERE "companyId" = c.id) as total_users
FROM users u
JOIN companies c ON u."companyId" = c.id
WHERE u.role = 'SUPER_ADMIN'
ORDER BY u.email;
