# Plano de Implementacao - Landing Page AdvWell

## Status Atual
- [x] Site deployado no Cloudflare Pages
- [x] Dominio configurado: https://advwell.pro
- [ ] Adicionar screenshots
- [ ] Adicionar video demo
- [ ] Corrigir erros no codigo

---

## Screenshots Necessarias

Criar pasta `screenshots/` com as seguintes imagens:

| Arquivo | Descricao | Status |
|---------|-----------|--------|
| `dashboard.png` | Tela inicial/Dashboard | Pendente |
| `processos.png` | Lista de processos | Pendente |
| `clientes.png` | Tela de clientes | Pendente |
| `financeiro.png` | Tela financeira | Pendente |
| `agenda.png` | Calendario/Agenda | Pendente |

**Como tirar screenshots:**
1. Acessar https://app.advwell.pro
2. Fazer login
3. Tirar print de cada tela (Windows: `Win + Shift + S` / Mac: `Cmd + Shift + 4`)
4. Salvar com os nomes acima

---

## Video Demo

**Opcao A - Video proprio:**
- Gravar demonstracao do sistema (2-5 minutos)
- Salvar como `demo-advwell.mp4`

**Opcao B - YouTube/Vimeo (recomendado):**
- Fazer upload do video no YouTube
- Pegar link de embed

---

## Erros a Corrigir

(Listar erros encontrados aqui)

---

## Processo de Atualizacao

1. Fazer alteracoes nos arquivos locais
2. Gerar novo ZIP: `cd /root/advwell/landing-page && zip -r /root/advwell-landing.zip .`
3. Baixar ZIP para o computador
4. No Cloudflare Pages > advwell-site > Deployments > Upload new version
5. Fazer upload do novo ZIP
6. Aguardar deploy (1-2 min)
7. Testar em https://advwell.pro

---

## URLs Importantes

- **Site de vendas:** https://advwell.pro
- **Sistema principal:** https://app.advwell.pro
- **API:** https://api.advwell.pro
- **Cloudflare Dashboard:** https://dash.cloudflare.com
