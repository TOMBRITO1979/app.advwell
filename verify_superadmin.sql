SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  u.active,
  c.name as company_name,
  c.email as company_email
FROM users u
JOIN companies c ON u."companyId" = c.id
WHERE u.email = 'appadvwell@gmail.com';
