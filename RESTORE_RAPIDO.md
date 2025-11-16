# 🚨 RESTAURAÇÃO RÁPIDA DO SISTEMA

**Se algo der errado, use este guia para voltar ao estado funcional!**

---

## ⚡ COMANDO ÚNICO - RESTAURAÇÃO AUTOMÁTICA

```bash
/root/advtom/backups/20251030_194403_sistema_funcional/restore.sh
```

**Este script restaura TUDO automaticamente em ~3 minutos:**
- ✅ Banco de dados PostgreSQL
- ✅ Código frontend e backend
- ✅ Imagens Docker
- ✅ Configurações
- ✅ Sistema completo deployado e funcionando

---

## 📋 O QUE ESTÁ NO BACKUP

**Data:** 30/10/2025 19:44 UTC
**Status:** Sistema 100% funcional
**Localização:** `/root/advtom/backups/20251030_194403_sistema_funcional/`

### Conteúdo:
```
✅ database_backup.sql (36KB)    - Banco completo com todos os dados
✅ backend_code.tar.gz (14KB)    - Código fonte backend
✅ frontend_code.tar.gz (12KB)   - Código fonte frontend
✅ frontend_image.tar (53MB)     - Imagem Docker frontend
✅ backend_image.tar (506MB)     - Imagem Docker backend
✅ docker-compose.yml            - Configuração do stack
✅ restore.sh                    - Script de restauração
✅ BACKUP_INFO.md               - Documentação completa
```

**Total:** ~560 MB

---

## 🎯 QUANDO RESTAURAR

Restaure este backup se:
- ❌ Login parou de funcionar
- ❌ API não responde
- ❌ Banco de dados corrompido
- ❌ Código quebrado após mudanças
- ❌ Deploy falhou
- ❌ Serviços não sobem
- ❌ Qualquer erro crítico que impeça o uso

---

## 🔄 PASSO A PASSO MANUAL (Se o script não funcionar)

### 1. Parar Serviços
```bash
docker stack rm advtom
sleep 15
```

### 2. Carregar Imagens Docker
```bash
cd /root/advtom/backups/20251030_194403_sistema_funcional
docker load -i frontend_image.tar
docker load -i backend_image.tar
docker tag 2766d5995112 tomautomations/advtom-frontend:latest
docker tag c31fd42cb2e4 tomautomations/advtom-backend:latest
```

### 3. Restaurar Código (Opcional)
```bash
cd /root/advtom
tar -xzf /root/advtom/backups/20251030_194403_sistema_funcional/backend_code.tar.gz
tar -xzf /root/advtom/backups/20251030_194403_sistema_funcional/frontend_code.tar.gz
```

### 4. Restaurar Configuração
```bash
cp /root/advtom/backups/20251030_194403_sistema_funcional/docker-compose.yml /root/advtom/
```

### 5. Redeploy Sistema
```bash
cd /root/advtom
docker stack deploy -c docker-compose.yml advtom
sleep 40
```

### 6. Restaurar Banco de Dados
```bash
# Aguardar postgres iniciar
POSTGRES_ID=$(docker ps -q -f name=advtom_postgres)

# Limpar banco atual
docker exec -i $POSTGRES_ID psql -U postgres -d advtom -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Restaurar backup
docker exec -i $POSTGRES_ID psql -U postgres -d advtom < /root/advtom/backups/20251030_194403_sistema_funcional/database_backup.sql
```

### 7. Verificar
```bash
curl -k https://api.advtom.com/health
docker service ls --filter name=advtom
```

---

## ✅ COMO SABER SE DEU CERTO

### Testes Rápidos:

**1. API Health:**
```bash
curl -k https://api.advtom.com/health
# Deve retornar: {"status":"ok",...}
```

**2. Serviços Rodando:**
```bash
docker service ls --filter name=advtom
# Todos devem estar 1/1
```

**3. Login API:**
```bash
curl -k -X POST https://api.advtom.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"joao@escritorio.com.br","password":"senha123"}'
# Deve retornar token JWT
```

**4. Frontend Acessível:**
- Abra: https://app.advtom.com/certificado.html
- Aceite o certificado SSL
- Acesse: https://app.advtom.com/login
- Faça login com: joao@escritorio.com.br / senha123

---

## 📊 DADOS NO BACKUP

### Usuários:
- **joao@escritorio.com.br** / senha123 (ADMIN)
- **teste@advtom.com** / teste123 (ADMIN)
- **carlos@superadmin.com** / senha123 (SUPER_ADMIN)

### Dados:
- 3 empresas cadastradas
- 11 clientes
- Múltiplos processos com movimentações

---

## 🆘 SE AINDA ASSIM NÃO FUNCIONAR

### 1. Verifique os Logs
```bash
docker service logs advtom_backend --tail 100
docker service logs advtom_frontend --tail 100
docker service logs advtom_postgres --tail 100
```

### 2. Verifique Status dos Containers
```bash
docker ps --filter name=advtom
docker service ps advtom_backend --no-trunc
```

### 3. Recrie Tudo do Zero
```bash
# Remover completamente
docker stack rm advtom
docker system prune -af --volumes

# Aguardar limpar
sleep 30

# Carregar imagens novamente
docker load -i /root/advtom/backups/20251030_194403_sistema_funcional/frontend_image.tar
docker load -i /root/advtom/backups/20251030_194403_sistema_funcional/backend_image.tar

# Redeployar
cd /root/advtom
docker stack deploy -c docker-compose.yml advtom
```

---

## 📝 LOGS DA RESTAURAÇÃO

O script automático cria um log em:
```
/root/advtom/restore_YYYYMMDD_HHMMSS.log
```

Consulte este arquivo se algo der errado durante a restauração.

---

## 🔐 CERTIFICADO SSL

**Importante:** Após restaurar, o certificado SSL continuará auto-assinado.

**Solução:**
1. Acesse: https://app.advtom.com/certificado.html
2. Siga as instruções para aceitar o certificado
3. Faça login normalmente

---

## 📚 DOCUMENTAÇÃO COMPLETA

Para mais detalhes, consulte:
- `/root/advtom/backups/20251030_194403_sistema_funcional/BACKUP_INFO.md`
- `/root/advtom/CLAUDE.md` (seção "Database Backup & System Restore")
- `/root/advtom/RELATORIO_DIAGNOSTICO_COMPLETO.md`

---

## ⚡ COMANDO RÁPIDO

**Lembre-se, para restaurar rapidamente:**
```bash
/root/advtom/backups/20251030_194403_sistema_funcional/restore.sh
```

**Pronto! Sistema volta ao estado funcional em poucos minutos!** ✅

---

**Backup criado em:** 30/10/2025 19:44 UTC
**Status do backup:** ✅ Sistema 100% funcional
**Próximo backup:** Criar antes de alterações importantes
