SELECT 
  c."processNumber",
  c.court,
  c.subject,
  cl.name as cliente
FROM cases c
JOIN companies co ON c."companyId" = co.id
LEFT JOIN clients cl ON c."clientId" = cl.id
WHERE co.name LIKE '%Costa%'
ORDER BY c."processNumber";
