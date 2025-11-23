SELECT 
  c.name as empresa,
  c.email as email_empresa,
  u.email as email_admin,
  u.name as nome_admin,
  u.role,
  (SELECT COUNT(*) FROM clients WHERE "companyId" = c.id) as total_clientes,
  (SELECT COUNT(*) FROM cases WHERE "companyId" = c.id) as total_processos,
  (SELECT COUNT(*) FROM cases WHERE "companyId" = c.id AND status = 'ACTIVE') as processos_ativos
FROM companies c
LEFT JOIN users u ON u."companyId" = c.id AND u.role IN ('ADMIN', 'SUPER_ADMIN')
ORDER BY total_processos DESC, total_clientes DESC;
