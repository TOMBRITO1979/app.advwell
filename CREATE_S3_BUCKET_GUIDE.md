# 🪣 Guia Passo a Passo: Criar Bucket S3 `advwell-app`

## ⚡ Acesso Rápido
**Console AWS S3:** https://s3.console.aws.amazon.com/s3/buckets?region=us-east-1

---

## 📝 Passo 1: Criar o Bucket

1. Acesse o Console AWS S3
2. Clique em **"Create bucket"** (botão laranja)
3. Preencha os campos:

### General Configuration
- **Bucket name:** `advwell-app`
- **AWS Region:** `US East (N. Virginia) us-east-1`

### Object Ownership
- ✅ Selecione: **ACLs disabled (recommended)**

### Block Public Access settings
- ✅ **Marque todas as opções** (Block all public access)
  - Block public access to buckets and objects granted through new access control lists (ACLs)
  - Block public access to buckets and objects granted through any access control lists (ACLs)
  - Block public access to buckets and objects granted through new public bucket or access point policies
  - Block public access to buckets and objects granted through any public bucket or access point policies

### Bucket Versioning
- Opcional: **Enable** (recomendado para backup)
- Ou: **Disable** (se não precisar de histórico)

### Tags (Opcional)
```
Key: Project    | Value: AdvWell
Key: Environment | Value: Production
```

### Default encryption
- ✅ Selecione: **Server-side encryption with Amazon S3 managed keys (SSE-S3)**
- Bucket Key: **Enable**

### Advanced settings
- Object Lock: **Disable** (não necessário)

4. Clique em **"Create bucket"**

---

## 🔐 Passo 2: Configurar CORS

1. No console S3, clique no bucket `advwell-app`
2. Vá para a aba **"Permissions"**
3. Role até **"Cross-origin resource sharing (CORS)"**
4. Clique em **"Edit"**
5. Cole a configuração abaixo:

```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE"
    ],
    "AllowedOrigins": [
      "https://app.advwell.pro",
      "https://api.advwell.pro"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

6. Clique em **"Save changes"**

---

## 👤 Passo 3: Verificar Permissões IAM

1. Acesse o **IAM Console:** https://console.aws.amazon.com/iam/
2. No menu lateral, clique em **"Users"**
3. Procure pelo usuário com Access Key: **AKIAUD4L3FBLAQQX67MB**
4. Clique no usuário
5. Vá para a aba **"Permissions"**
6. Verifique se existe uma policy com as seguintes permissões:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::advwell-app",
        "arn:aws:s3:::advwell-app/*"
      ]
    }
  ]
}
```

### Se não existir, adicione:

1. Clique em **"Add permissions" → "Create inline policy"**
2. Clique na aba **"JSON"**
3. Cole a policy acima
4. Clique em **"Review policy"**
5. Nome da policy: `AdvWellS3Access`
6. Clique em **"Create policy"**

---

## ✅ Passo 4: Testar Configuração

### Teste via AWS CLI (se disponível):

```bash
# Listar buckets
aws s3 ls

# Verificar bucket específico
aws s3 ls s3://advwell-app/

# Testar upload (arquivo de teste)
echo "teste" > /tmp/test.txt
aws s3 cp /tmp/test.txt s3://advwell-app/test.txt

# Verificar upload
aws s3 ls s3://advwell-app/

# Remover arquivo de teste
aws s3 rm s3://advwell-app/test.txt
```

### Teste via Interface AdvWell:

1. Acesse: https://app.advwell.pro
2. Faça login com credenciais de admin
3. Vá para **"Documentos"**
4. Clique em **"Adicionar Documento"**
5. Faça upload de um arquivo PDF ou imagem
6. Verifique se o upload foi bem-sucedido
7. Abra o documento para confirmar que está acessível

### Verificar no Console S3:

1. Acesse o bucket `advwell-app` no console
2. Você deverá ver pastas com nomes como:
   - `admin-at-empresa.com/`
   - `outro-email-at-domain.com/`
3. Dentro de cada pasta, haverá uma subpasta `documents/`
4. Os arquivos estarão nomeados como: `uuid.extensao`

---

## 🚨 Troubleshooting

### Erro: "Access Denied" ao fazer upload

**Causa:** Permissões IAM insuficientes

**Solução:**
1. Verifique se a IAM policy foi criada corretamente (Passo 3)
2. Confirme que o Access Key está ativo
3. Aguarde alguns minutos para as permissões propagarem

### Erro: "Bucket already exists"

**Causa:** Nome do bucket já está sendo usado (buckets S3 são globais)

**Solução:**
1. Use um nome alternativo como: `advwell-app-prod` ou `advwell-sistema`
2. Atualize o docker-compose.yml com o novo nome:
   ```yaml
   - S3_BUCKET_NAME=advwell-app-prod
   ```
3. Reinicie o backend:
   ```bash
   docker service update advtom_backend --env-add S3_BUCKET_NAME=advwell-app-prod
   ```

### Erro: "CORS policy" ao fazer upload via interface

**Causa:** CORS não configurado corretamente

**Solução:**
1. Revise o Passo 2
2. Certifique-se que as origens incluem:
   - `https://app.advwell.pro`
   - `https://api.advwell.pro`
3. Salve as mudanças e limpe o cache do navegador

---

## 📊 Verificação Final

Checklist antes de concluir:

- [ ] Bucket `advwell-app` criado na região `us-east-1`
- [ ] Block all public access **ATIVADO**
- [ ] Server-side encryption (SSE-S3) **ATIVADO**
- [ ] CORS configurado com origens corretas
- [ ] IAM permissions incluem `advwell-app` bucket
- [ ] Teste de upload bem-sucedido via interface
- [ ] Arquivos visíveis no console S3 com estrutura correta
- [ ] Download de arquivos funcionando

---

## 📞 Suporte

Se encontrar problemas:

1. **Verificar logs do backend:**
   ```bash
   docker service logs advtom_backend -f | grep -i s3
   ```

2. **Testar conectividade AWS:**
   ```bash
   docker exec -it $(docker ps -q -f name=advtom_backend) sh
   aws s3 ls s3://advwell-app/
   ```

3. **Consultar documentação:**
   - AWS S3 Guide: https://docs.aws.amazon.com/s3/
   - AdvWell Docs: /root/advtom/CLAUDE.md

---

**Criado por:** Claude Code AI Assistant  
**Data:** 16/11/2025  
**Versão:** 1.0
