-- Buscar detalhes da empresa Costa
SELECT 
  'EMPRESA' as tipo,
  c.name,
  c.email,
  '' as processos,
  '' as cliente
FROM companies c
WHERE c.name LIKE '%Costa%'

UNION ALL

SELECT 
  'PROCESSOS' as tipo,
  ca.processNumber as name,
  ca.court as email,
  ca.subject as processos,
  cl.name as cliente
FROM cases ca
JOIN companies co ON ca."companyId" = co.id
LEFT JOIN clients cl ON ca."clientId" = cl.id
WHERE co.name LIKE '%Costa%'
ORDER BY tipo DESC, name;
