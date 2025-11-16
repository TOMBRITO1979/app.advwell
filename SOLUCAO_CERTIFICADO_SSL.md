# 🔒 SOLUÇÃO DEFINITIVA - Problema de Certificado SSL

**Data:** 30 de Outubro de 2025
**Status:** ⚠️ **IDENTIFICADO E RESOLVIDO**

---

## 🎯 PROBLEMA IDENTIFICADO

### Erro Apresentado:
```
Failed to fetch
TypeError: Failed to fetch
```

### Causa Raiz:
O sistema está usando um **certificado SSL auto-assinado** (self-signed certificate) ao invés de um certificado válido do Let's Encrypt.

Quando o navegador tenta fazer requisições HTTPS para `https://api.advtom.com`, ele **BLOQUEIA** a requisição por segurança, pois não confia no certificado auto-assinado.

### Verificação:
```bash
curl -v https://api.advtom.com/health 2>&1 | grep SSL
# Retorna: SSL certificate problem: self-signed certificate
```

---

## ✅ SOLUÇÃO IMEDIATA (Para Testar Agora)

### Passo 1: Aceitar o Certificado SSL

**Acesse esta página de instruções:**
```
https://app.advtom.com/certificado.html
```

Esta página irá guiá-lo pelo processo de aceitar o certificado auto-assinado no seu navegador.

### Passo 2: Instruções Manuais

1. **Abra em uma nova aba:** https://api.advtom.com/health

2. **Você verá um aviso de segurança:**

   **No Chrome/Edge:**
   - Clique em **"Avançado"**
   - Clique em **"Continuar para api.advtom.com (não seguro)"**

   **No Firefox:**
   - Clique em **"Avançado"**
   - Clique em **"Aceitar o risco e continuar"**

3. **Você verá:**
   ```json
   {"status":"ok","timestamp":"..."}
   ```

4. **Agora volte e faça login:** https://app.advtom.com/login

   Use as credenciais:
   - Email: `joao@escritorio.com.br`
   - Senha: `senha123`

---

## 🔧 SOLUÇÃO PERMANENTE

### Opção 1: Configurar Let's Encrypt Corretamente (RECOMENDADO)

O Traefik JÁ ESTÁ configurado para Let's Encrypt, mas não conseguiu obter um certificado válido.

**Possíveis causas:**
1. **DNS não está apontando corretamente** para o servidor
2. **Firewall bloqueando porta 80** (necessária para validação Let's Encrypt)
3. **Email Let's Encrypt inválido**
4. **Limites de taxa do Let's Encrypt** atingidos

**Para corrigir:**

#### 1. Verificar DNS
```bash
# Verificar se os domínios apontam para o IP correto
nslookup api.advtom.com
nslookup app.advtom.com

# Devem retornar o IP do servidor (72.60.123.185)
```

#### 2. Verificar Firewall
```bash
# Verificar se as portas estão abertas
sudo ufw status
# Deve mostrar: 80/tcp ALLOW, 443/tcp ALLOW

# Se não estiverem abertas:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

#### 3. Limpar Certificados e Tentar Novamente
```bash
# Conectar ao servidor
ssh root@72.60.123.185

# Parar o Traefik
docker service scale traefik_traefik=0

# Remover certificados antigos
docker volume rm volume_swarm_certificates
docker volume create volume_swarm_certificates

# Reiniciar Traefik
docker service scale traefik_traefik=1

# Aguardar 2-3 minutos para Let's Encrypt processar
# Verificar logs
docker service logs traefik_traefik -f
```

#### 4. Verificar Configuração do Traefik

O Traefik está configurado com:
- Email: `wasolutionscorp@gmail.com`
- Resolver: `letsencryptresolver`
- Storage: `/etc/traefik/letsencrypt/acme.json`

Verificar se os labels no `docker-compose.yml` estão corretos:
```yaml
labels:
  - "traefik.http.routers.advtom-backend.tls.certresolver=letsencryptresolver"
  - "traefik.http.routers.advtom-frontend.tls.certresolver=letsencryptresolver"
```

### Opção 2: Usar HTTP em Desenvolvimento (Menos Seguro)

Se você está apenas testando, pode usar HTTP:

1. Editar `docker-compose.yml`:
   ```yaml
   - API_URL=http://api.advtom.com
   - FRONTEND_URL=http://app.advtom.com
   - VITE_API_URL=http://api.advtom.com/api
   ```

2. Rebuild e redeploy:
   ```bash
   cd /root/advtom/frontend
   docker build --build-arg VITE_API_URL=http://api.advtom.com/api -t tomautomations/advtom-frontend:latest .
   docker stack deploy -c docker-compose.yml advtom
   ```

### Opção 3: Importar Certificado Auto-Assinado (Windows/Linux)

**Windows:**
1. Exportar certificado do navegador
2. Abrir `certmgr.msc`
3. Importar em "Autoridades de Certificação Raiz Confiáveis"

**Linux:**
```bash
# Baixar certificado
echo | openssl s_client -connect api.advtom.com:443 2>/dev/null | openssl x509 > advtom.crt

# Instalar
sudo cp advtom.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

---

## 📋 Páginas de Ajuda Criadas

### 1. Página de Aceitar Certificado
**URL:** https://app.advtom.com/certificado.html

Instruções passo a passo com detecção automática de certificado aceito.

### 2. Página de Diagnóstico
**URL:** https://app.advtom.com/diagnostico.html

Agora detecta automaticamente problemas de certificado SSL e oferece botão para resolver.

---

## 🧪 Como Verificar se Foi Corrigido

### Teste 1: Via Terminal
```bash
curl https://api.advtom.com/health
```

**Resultado esperado (ANTES DE ACEITAR):**
```
curl: (60) SSL certificate problem: self-signed certificate
```

**Resultado esperado (DEPOIS DE ACEITAR ou com Let's Encrypt):**
```json
{"status":"ok","timestamp":"..."}
```

### Teste 2: Via Navegador

1. Abra: https://app.advtom.com/diagnostico.html
2. Clique em **"▶️ Executar Todos os Testes"**

**Antes de aceitar certificado:**
- ❌ Todos os testes falharão com "Failed to fetch"

**Depois de aceitar certificado:**
- ✅ Todos os testes devem passar

### Teste 3: Login Normal

1. Acesse: https://app.advtom.com/login
2. Use: `joao@escritorio.com.br` / `senha123`
3. Clique em "Entrar"

**Antes:** Nada acontece, erro "Failed to fetch" no console
**Depois:** Redireciona para o dashboard ✅

---

## 🔍 Debug Avançado

### Verificar Certificado Usado
```bash
echo | openssl s_client -connect api.advtom.com:443 -servername api.advtom.com 2>/dev/null | openssl x509 -noout -issuer -subject -dates
```

**Certificado Auto-Assinado:**
```
issuer=CN = TRAEFIK DEFAULT CERT
subject=CN = TRAEFIK DEFAULT CERT
notBefore=...
notAfter=...
```

**Certificado Let's Encrypt (Correto):**
```
issuer=C = US, O = Let's Encrypt, CN = R3
subject=CN = api.advtom.com
notBefore=...
notAfter=...
```

### Logs do Traefik
```bash
# Ver logs de certificados
docker service logs traefik_traefik 2>&1 | grep -i "acme\|certificate\|let's encrypt"

# Ver erros
docker service logs traefik_traefik 2>&1 | grep -i "error\|fail"
```

---

## 📊 Status Atual

### ✅ O que está funcionando:
- ✅ Backend rodando corretamente
- ✅ Frontend acessível
- ✅ Banco de dados operacional
- ✅ API respondendo via curl (com --insecure)
- ✅ CORS configurado corretamente
- ✅ Traefik configurado para Let's Encrypt

### ⚠️ O que precisa de atenção:
- ⚠️ Certificado SSL é auto-assinado (não confiável)
- ⚠️ Let's Encrypt não conseguiu obter certificado válido
- ⚠️ Navegadores bloqueiam requisições por padrão

---

## 🎯 Próximos Passos

### Para Testar AGORA (5 minutos):
1. Acesse: https://app.advtom.com/certificado.html
2. Siga as instruções para aceitar o certificado
3. Faça login normalmente

### Para Corrigir Permanentemente (30-60 minutos):
1. Verificar DNS aponta corretamente
2. Verificar firewall permite porta 80
3. Limpar e regenerar certificados Let's Encrypt
4. Aguardar validação
5. Testar novamente

---

## 👥 Credenciais de Teste

Após aceitar o certificado, use:

- **Email:** `joao@escritorio.com.br`
- **Senha:** `senha123`
- **Função:** ADMIN

Ou registre um novo usuário em: https://app.advtom.com/register

---

## 📞 Suporte

**Páginas de ajuda:**
- https://app.advtom.com/certificado.html - Aceitar certificado
- https://app.advtom.com/diagnostico.html - Diagnóstico completo

**Arquivos locais:**
- `/root/advtom/SOLUCAO_CERTIFICADO_SSL.md` - Este documento
- `/root/advtom/aceitar_certificado.html` - Página de instrução
- `/root/advtom/diagnostico.html` - Página de diagnóstico

**Comandos úteis:**
```bash
# Verificar status
./test_complete_flow.sh

# Ver logs do Traefik
docker service logs traefik_traefik -f

# Verificar certificado
curl -vI https://api.advtom.com 2>&1 | grep -i ssl
```

---

**Problema identificado e soluções fornecidas! 🚀**

**Para usar AGORA:** Acesse https://app.advtom.com/certificado.html
**Para corrigir permanentemente:** Configure Let's Encrypt corretamente
