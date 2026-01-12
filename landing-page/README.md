# AdvWell Landing Page - Pagina de Vendas

Pagina de apresentacao do AdvWell para campanhas de vendas.

## Como Visualizar

1. Abra o arquivo `index.html` diretamente no navegador
2. Ou use um servidor local (ex: Live Server no VS Code)

```bash
# Se tiver Python instalado:
python -m http.server 8000

# Acesse: http://localhost:8000
```

## Como Personalizar

### 1. Adicionar Screenshots

Crie uma pasta `screenshots/` e adicione suas imagens:

```
landing-page/
  index.html
  screenshots/
    dashboard.png      (1920x1080 ou 1200x750)
    processos.png
    clientes.png
    financeiro.png
    agenda.png
```

No HTML, descomente as linhas de `<img>` e remova os placeholders:

```html
<!-- De: -->
<div class="gallery-container active" id="gallery-dashboard">
    <div class="screenshot-placeholder">...</div>
</div>

<!-- Para: -->
<div class="gallery-container active" id="gallery-dashboard">
    <img src="screenshots/dashboard.png" alt="Dashboard">
</div>
```

### 2. Adicionar Video de Demonstracao

No `<div class="video-wrapper">`, escolha uma das opcoes:

**Opcao A - Video Local (MP4):**
```html
<video controls poster="video-thumbnail.jpg">
    <source src="demo-advwell.mp4" type="video/mp4">
</video>
```

**Opcao B - YouTube:**
```html
<iframe src="https://www.youtube.com/embed/SEU_VIDEO_ID" allowfullscreen></iframe>
```

**Opcao C - Vimeo:**
```html
<iframe src="https://player.vimeo.com/video/SEU_VIDEO_ID" allowfullscreen></iframe>
```

### 3. Adicionar Screenshot do Hero

No hero section, substitua o placeholder:

```html
<div class="hero-image-placeholder">
    <img src="screenshot-dashboard.png" alt="Dashboard AdvWell">
</div>
```

### 4. Alterar Precos

Procure pela secao `#pricing` e altere os valores:

```html
<div class="price">
    R$97<span>/mes</span>
    <small>ou R$970/ano (2 meses gratis)</small>
</div>
```

### 5. Alterar Estatisticas

No hero, altere os numeros:

```html
<div class="stat">
    <div class="stat-number">500+</div>
    <div class="stat-label">Escritorios Ativos</div>
</div>
```

### 6. Alterar Depoimentos

Edite os testimonials na secao correspondente:

```html
<div class="testimonial-card">
    <p>"Seu depoimento aqui..."</p>
    <div class="testimonial-author">
        <div class="author-avatar">XX</div>
        <div class="author-info">
            <h4>Nome do Advogado</h4>
            <span>Especialidade - Estado</span>
        </div>
    </div>
</div>
```

### 7. Links de CTA

Altere os links dos botoes para suas URLs:

```html
<a href="https://app.advwell.pro/register" class="btn btn-primary">
    Comecar Gratis
</a>
```

## Deploy no Cloudflare Pages

1. Crie um repositorio no GitHub
2. Faca push da pasta `landing-page`
3. No Cloudflare Dashboard:
   - Va em Pages > Create a project
   - Conecte seu repositorio GitHub
   - Configure:
     - Build command: (deixe vazio)
     - Build output directory: `/` ou `.`
   - Deploy

Ou use o Cloudflare Pages Direct Upload:
1. Compacte os arquivos em .zip
2. Va em Cloudflare Pages > Create a project > Direct Upload
3. Faca upload do .zip

## Estrutura de Arquivos Recomendada

```
landing-page/
  index.html
  README.md
  screenshots/
    dashboard.png
    processos.png
    clientes.png
    financeiro.png
    agenda.png
  video/
    demo-advwell.mp4
    video-thumbnail.jpg
```

## Cores Personalizadas

Edite as variaveis CSS no inicio do arquivo:

```css
:root {
    --primary: #2563eb;        /* Azul principal */
    --primary-dark: #1d4ed8;   /* Azul escuro */
    --primary-light: #3b82f6;  /* Azul claro */
    --secondary: #0f172a;      /* Texto escuro */
    --accent: #06b6d4;         /* Cor de destaque */
}
```

## Contato

Para duvidas sobre a landing page ou o sistema AdvWell, entre em contato.
