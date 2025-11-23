-- Reset password and unlock: appadvwell@gmail.com
UPDATE users SET
  password = '$2b$10$IIwzGyqIpOPcgGAredkSJengpDqWLKl2Os94C1japDJWm5pOAyYGW',
  "failedLoginAttempts" = 0,
  "accountLockedUntil" = NULL
WHERE email = 'appadvwell@gmail.com'
RETURNING email, name, role, active;

-- Reset password and unlock: wasolutionscorp@gmail.com
UPDATE users SET
  password = '$2b$10$gREiu.w4LhJBX2Wkd4E.0.VJd/Xtm2epGqzk6M51kiA6W3bmy6Pp2',
  "failedLoginAttempts" = 0,
  "accountLockedUntil" = NULL
WHERE email = 'wasolutionscorp@gmail.com'
RETURNING email, name, role, active;

-- Reset password and unlock: admin@costaassociados.adv.br
UPDATE users SET
  password = '$2b$10$1wP6O6PwWocpIeSV61CJIuX545WFwnUOYJajBoPM0O9aWD/uPpSMu',
  "failedLoginAttempts" = 0,
  "accountLockedUntil" = NULL
WHERE email = 'admin@costaassociados.adv.br'
RETURNING email, name, role, active;
