# 📦 Setup do GitHub para o Projeto AdvWell

## Status Atual

✅ Repositório Git inicializado
✅ Commit inicial criado (cb1779f)
✅ 113 arquivos versionados
⏳ Aguardando configuração do remote

---

## Como Fazer Push para o GitHub

### 1. Criar Repositório no GitHub

1. Acesse https://github.com
2. Clique em "New Repository" (ou acesse https://github.com/new)
3. Preencha as informações:
   - **Repository name:** advwell (ou outro nome de sua preferência)
   - **Description:** Sistema multitenant para escritórios de advocacia com integração DataJud CNJ
   - **Visibility:** Private (recomendado - contém código do sistema)
   - **NÃO** inicialize com README, .gitignore ou license (já temos esses arquivos)
4. Clique em "Create repository"

### 2. Adicionar Remote e Fazer Push

Após criar o repositório no GitHub, você verá instruções. Use estes comandos:

```bash
cd /root/advtom

# Adicione o remote (substitua SEU_USUARIO e advwell pelo nome correto)
git remote add origin https://github.com/SEU_USUARIO/advwell.git

# Ou se preferir usar SSH (requer configuração de chaves SSH)
# git remote add origin git@github.com:SEU_USUARIO/advwell.git

# Renomeie a branch para main (padrão do GitHub)
git branch -M main

# Faça o push inicial
git push -u origin main
```

### 3. Autenticação

O GitHub não aceita mais senha via HTTPS. Você tem duas opções:

#### Opção A: Personal Access Token (mais fácil)

1. Acesse https://github.com/settings/tokens
2. Clique em "Generate new token (classic)"
3. Dê um nome (ex: "AdvWell Deploy Server")
4. Marque os escopos: `repo` (todos os sub-items)
5. Clique em "Generate token"
6. **COPIE O TOKEN** (só aparece uma vez!)
7. Use o token como senha quando o git pedir

#### Opção B: SSH Key (mais seguro)

```bash
# Gerar chave SSH
ssh-keygen -t ed25519 -C "wasolutionscorp@gmail.com"

# Copiar chave pública
cat ~/.ssh/id_ed25519.pub

# Cole a chave em: https://github.com/settings/ssh/new
```

---

## Arquivos no Repositório

### ✅ Incluídos (113 arquivos)
- Código fonte (backend + frontend)
- Arquivos de configuração (docker-compose.yml)
- Scripts de deploy e verificação
- Documentação completa (CLAUDE.md, etc.)
- Schemas do Prisma

### ❌ Excluídos (via .gitignore)
- node_modules/
- .env (variáveis de ambiente sensíveis)
- CREDENTIALS_COMPLETE.txt (senhas)
- backups/ (muito grandes)
- dist/, build/ (compilados)
- *.sql (dumps do banco)

---

## Commit Inicial

**Hash:** cb1779f
**Mensagem:** feat: Sistema AdvWell.pro v1 - Migração completa e correção de case parts

**Conteúdo:**
- ✅ Migração de URLs para advwell.pro
- ✅ Correção de case parts (handleEdit + handleSubmit)
- ✅ População completa do banco (646+ registros)
- ✅ Sistema 100% funcional
- ✅ Backup completo documentado
- ✅ CLAUDE.md atualizado

---

## Próximos Passos (Após Push)

1. **Adicione proteção à branch main:**
   - Settings → Branches → Add rule
   - Branch name pattern: `main`
   - Marque: "Require pull request reviews before merging"

2. **Configure GitHub Actions (opcional):**
   - Criar `.github/workflows/deploy.yml`
   - Automatizar build e deploy das imagens Docker

3. **Adicione colaboradores (se necessário):**
   - Settings → Collaborators → Add people

---

## Comandos Úteis

```bash
# Ver status do repositório
git status

# Ver histórico de commits
git log --oneline

# Ver arquivos rastreados
git ls-files

# Ver remote configurado
git remote -v

# Fazer push de novos commits
git add .
git commit -m "mensagem"
git push
```

---

## Troubleshooting

### Erro: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/SEU_USUARIO/advwell.git
```

### Erro: "authentication failed"
- Use Personal Access Token como senha (não a senha da conta)
- Ou configure SSH keys

### Erro: "refusing to merge unrelated histories"
```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

---

**Criado em:** 02/11/2025 19:50 UTC
**Git commit:** cb1779f
**Estado:** Pronto para push
