# AdvWell Design System v1.0

## 🎨 Guia Oficial de Botões e Ícones

Este documento define os padrões visuais para todos os botões, ícones e componentes interativos do AdvWell.

---

## 1. CORES PADRÃO

### Cores de Ação
| Nome | Uso | Classe CSS | Hex |
|------|-----|------------|-----|
| **Primary** | Ações principais (criar, salvar, confirmar) | `primary-600` / `primary-700` (hover) | #2563eb |
| **Secondary** | Ações secundárias (cancelar, voltar) | `neutral-300` / `neutral-50` (hover) | #d4d4d4 |
| **Danger** | Ações destrutivas (deletar, remover) | `error-600` / `error-700` (hover) | #dc2626 |
| **Success** | Ações positivas (ativar, aprovar) | `green-600` / `green-700` (hover) | #16a34a |
| **Warning** | Ações de alerta (arquivar, pausar) | `yellow-600` / `yellow-700` (hover) | #ca8a04 |
| **Info** | Links externos, visualizar | `blue-600` / `blue-700` (hover) | #2563eb |

### Cores Especiais
| Nome | Uso | Classe CSS |
|------|-----|------------|
| **AI/IA** | Funcionalidades de inteligência artificial | `purple-600` / `purple-700` (hover) |
| **Sync** | Sincronizações e atualizações | `primary-600` / `primary-700` (hover) |

---

## 2. TAMANHOS DE BOTÕES

### Padrões de Tamanho
| Size | Padding | Min Height | Font Size | Border Radius | Contexto |
|------|---------|------------|-----------|---------------|----------|
| **sm** | `px-3 py-1.5` | `36px` | `text-sm` | `rounded-md` | Ações em tabelas, filtros |
| **md** | `px-4 py-2` | `44px` | `text-base` | `rounded-lg` | Botões principais (padrão) |
| **lg** | `px-6 py-3` | `52px` | `text-lg` | `rounded-lg` | CTAs, ações principais em destaque |

**IMPORTANTE:** Todos os botões DEVEM ter `min-h-[44px]` mínimo para acessibilidade touch mobile.

---

## 3. VARIANTES DE BOTÕES

### 3.1 Botão Primário (Primary)
**Uso:** Ações principais como "Salvar", "Criar", "Adicionar"

**Classes CSS:**
```
inline-flex items-center justify-center gap-2
px-4 py-2 min-h-[44px]
bg-primary-600 hover:bg-primary-700
text-white font-medium
rounded-lg shadow-sm hover:shadow-md
transition-all duration-200
disabled:opacity-50 disabled:cursor-not-allowed
```

**Exemplo:**
```tsx
<button className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
  <Plus size={20} />
  <span>Novo Processo</span>
</button>
```

---

### 3.2 Botão Secundário (Secondary)
**Uso:** Ações de suporte como "Cancelar", "Voltar", "Fechar"

**Classes CSS:**
```
inline-flex items-center justify-center gap-2
px-4 py-2 min-h-[44px]
border-2 border-neutral-300 hover:border-neutral-400
bg-white hover:bg-neutral-50
text-neutral-700 font-medium
rounded-lg
transition-all duration-200
disabled:opacity-50 disabled:cursor-not-allowed
```

**Exemplo:**
```tsx
<button className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border-2 border-neutral-300 hover:border-neutral-400 bg-white hover:bg-neutral-50 text-neutral-700 font-medium rounded-lg transition-all duration-200">
  <span>Cancelar</span>
</button>
```

---

### 3.3 Botão Danger (Deletar)
**Uso:** Ações destrutivas como "Deletar", "Remover", "Excluir"

**Classes CSS:**
```
inline-flex items-center justify-center gap-2
px-4 py-2 min-h-[44px]
bg-error-600 hover:bg-error-700
text-white font-medium
rounded-lg shadow-sm hover:shadow-md
transition-all duration-200
disabled:opacity-50 disabled:cursor-not-allowed
```

**Exemplo:**
```tsx
<button className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-error-600 hover:bg-error-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
  <Trash2 size={20} />
  <span>Sim, Deletar</span>
</button>
```

---

### 3.4 Botão Success (Sucesso)
**Uso:** Ações positivas como "Ativar", "Aprovar", "Confirmar"

**Classes CSS:**
```
inline-flex items-center justify-center gap-2
px-4 py-2 min-h-[44px]
bg-green-600 hover:bg-green-700
text-white font-medium
rounded-lg shadow-sm hover:shadow-md
transition-all duration-200
disabled:opacity-50 disabled:cursor-not-allowed
```

---

### 3.5 Botão Ghost (Ícone apenas)
**Uso:** Ações em tabelas (editar, deletar, visualizar)

**Classes CSS:**
```
inline-flex items-center justify-center
p-2 min-h-[44px] min-w-[44px]
text-{color}-600 hover:text-{color}-700
hover:bg-{color}-50
rounded-md
transition-all duration-200
disabled:opacity-50 disabled:cursor-not-allowed
```

**Cores por Ação:**
- **Editar:** `primary-600` / `primary-50`
- **Deletar:** `error-600` / `error-50`
- **Visualizar:** `blue-600` / `blue-50`
- **Sincronizar:** `primary-600` / `primary-50`

**Exemplo:**
```tsx
{/* Editar */}
<button
  className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-all duration-200"
  title="Editar"
>
  <Edit size={18} />
</button>

{/* Deletar */}
<button
  className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-error-600 hover:text-error-700 hover:bg-error-50 rounded-md transition-all duration-200"
  title="Deletar"
>
  <Trash2 size={18} />
</button>
```

---

### 3.6 Botão AI/Especial
**Uso:** Funcionalidades de IA, recursos premium

**Classes CSS:**
```
inline-flex items-center justify-center gap-2
px-4 py-2 min-h-[44px]
bg-purple-600 hover:bg-purple-700
text-white font-medium
rounded-lg shadow-sm hover:shadow-md
transition-all duration-200
disabled:opacity-50 disabled:cursor-not-allowed
```

**Exemplo:**
```tsx
<button className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
  <Sparkles size={20} />
  <span>Gerar Resumo IA</span>
</button>
```

---

## 4. ÍCONES PADRÃO (Lucide React)

### 4.1 Tamanhos Oficiais
| Contexto | Tamanho | Uso |
|----------|---------|-----|
| **Ícones inline** | `16px` | Dentro de textos, badges |
| **Botões de ação (tabelas)** | `18px` | Edit, Delete, View em tabelas |
| **Botões principais** | `20px` | Botões com texto (Primary, Secondary) |
| **Ícones decorativos** | `24px` | Headers, títulos de seção |
| **Empty states** | `48px+` | Quando não há dados |

### 4.2 Ícones por Categoria

#### Ações CRUD
| Ação | Ícone | Tamanho | Cor |
|------|-------|---------|-----|
| Adicionar | `Plus` | 20px | primary-600 |
| Editar | `Edit` | 18px | primary-600 |
| Deletar | `Trash2` | 18px | error-600 |
| Visualizar | `Eye` | 18px | blue-600 |
| Salvar | `Save` | 20px | primary-600 |

#### Navegação
| Ação | Ícone | Tamanho |
|------|-------|---------|
| Fechar | `X` | 24px |
| Buscar | `Search` | 20px |
| Filtrar | `Filter` | 20px |
| Voltar | `ArrowLeft` | 20px |

#### Sincronização
| Ação | Ícone | Tamanho | Cor |
|------|-------|---------|-----|
| Sincronizar | `RefreshCw` | 18px | primary-600 |
| Atualizar | `RefreshCw` | 20px | primary-600 |
| IA | `Sparkles` | 20px | purple-600 |

#### Dados
| Tipo | Ícone | Tamanho |
|------|-------|---------|
| Usuário | `User` | 16px (inline), 20px (standalone) |
| Empresa | `Building2` | 20px |
| Processo | `FileText` | 20px |
| Data | `Calendar` | 16px |
| Hora | `Clock` | 16px |

#### Financeiro
| Tipo | Ícone | Tamanho | Cor |
|------|-------|---------|-----|
| Receita | `TrendingUp` | 20px | green-600 |
| Despesa | `TrendingDown` | 20px | error-600 |
| Saldo | `DollarSign` | 24px | primary-600 |

#### Status/Toggle
| Estado | Ícone | Tamanho | Cor |
|--------|-------|---------|-----|
| Ativo | `ToggleRight` | 20px | green-600 |
| Inativo | `ToggleLeft` | 20px | neutral-400 |

---

## 5. BADGES DE STATUS

### Cores de Status
| Status | Background | Text | Border |
|--------|------------|------|--------|
| **Ativo** | `bg-green-100` | `text-green-800` | - |
| **Pendente** | `bg-yellow-100` | `text-yellow-800` | - |
| **Arquivado** | `bg-neutral-100` | `text-neutral-600` | - |
| **Finalizado** | `bg-blue-100` | `text-blue-800` | - |
| **Cancelado** | `bg-error-100` | `text-error-800` | - |

### Classes CSS Padrão
```
inline-flex items-center
px-2.5 py-0.5
rounded-full
text-xs font-medium
bg-{color}-100 text-{color}-800
```

**Exemplo:**
```tsx
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
  Ativo
</span>
```

---

## 6. ESPAÇAMENTO (GAP)

### Padrões de Gap
| Contexto | Gap | Classe |
|----------|-----|--------|
| Ícone + Texto (botões) | 8px | `gap-2` |
| Grupo de botões | 12px | `gap-3` |
| Cards/Seções | 16px | `gap-4` |
| Seções grandes | 24px | `gap-6` |

---

## 7. RESPONSIVIDADE

### Breakpoints
```
sm: 640px   (tablet portrait)
md: 768px   (tablet landscape)
lg: 1024px  (desktop)
xl: 1280px  (large desktop)
```

### Padrões Mobile-First

#### Botões com Texto Responsivo
```tsx
{/* Mobile: ícone apenas, Desktop: ícone + texto */}
<button className="...">
  <Plus size={20} />
  <span className="hidden sm:inline">Novo Processo</span>
</button>
```

#### Grid Responsivo
```tsx
{/* Mobile: 1 coluna, Tablet: 2 colunas, Desktop: 3 colunas */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* conteúdo */}
</div>
```

#### Flex Responsivo
```tsx
{/* Mobile: stack vertical, Desktop: horizontal */}
<div className="flex flex-col sm:flex-row gap-3">
  {/* conteúdo */}
</div>
```

---

## 8. ACESSIBILIDADE

### Regras Obrigatórias

1. **Min-height touch:** Todos os elementos interativos DEVEM ter `min-h-[44px]` mínimo
2. **Títulos em botões:** Botões sem texto devem ter `title` attribute
3. **Focus visible:** Todos os botões devem ter estado focus visível (padrão do Tailwind)
4. **Contraste:** Seguir WCAG AA (4.5:1 para texto normal)
5. **Disabled state:** Botões desabilitados devem ter `opacity-50` e `cursor-not-allowed`

**Exemplo Completo:**
```tsx
<button
  className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
  title="Editar processo"
  disabled={isLoading}
  aria-label="Editar processo"
>
  <Edit size={18} />
</button>
```

---

## 9. TRANSIÇÕES E ANIMAÇÕES

### Padrões de Transição
```
transition-all duration-200    // Transições suaves (botões, hovers)
transition-colors duration-150 // Apenas cores (links, texto)
transition-transform duration-200 // Transformações (modais, dropdowns)
```

### Efeitos Hover
- **Botões Primary/Danger:** Escurecer cor + adicionar shadow
- **Botões Secondary:** Mudar background
- **Botões Ghost:** Adicionar background suave + escurecer cor
- **Links:** Underline + escurecer cor

---

## 10. EXEMPLOS DE USO

### Header de Página
```tsx
<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
  <h1 className="text-2xl font-bold text-neutral-900">Processos</h1>

  <div className="flex flex-wrap gap-3">
    {/* Botões secundários */}
    <button className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border-2 border-neutral-300 hover:border-neutral-400 bg-white hover:bg-neutral-50 text-neutral-700 font-medium rounded-lg transition-all duration-200">
      <Filter size={20} />
      <span className="hidden sm:inline">Filtros</span>
    </button>

    {/* Botão primário */}
    <button className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
      <Plus size={20} />
      <span>Novo Processo</span>
    </button>
  </div>
</div>
```

### Ações em Tabela
```tsx
<td className="px-6 py-4 whitespace-nowrap text-right">
  <div className="flex items-center justify-end gap-2">
    {/* Editar */}
    <button
      className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-all duration-200"
      onClick={() => handleEdit(row.id)}
      title="Editar"
      aria-label="Editar processo"
    >
      <Edit size={18} />
    </button>

    {/* Deletar */}
    <button
      className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-error-600 hover:text-error-700 hover:bg-error-50 rounded-md transition-all duration-200"
      onClick={() => handleDelete(row.id)}
      title="Deletar"
      aria-label="Deletar processo"
    >
      <Trash2 size={18} />
    </button>
  </div>
</td>
```

### Modal Footer
```tsx
<div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
  {/* Cancelar */}
  <button
    onClick={onClose}
    className="inline-flex items-center justify-center gap-2 px-6 py-2 min-h-[44px] border-2 border-neutral-300 hover:border-neutral-400 bg-white hover:bg-neutral-50 text-neutral-700 font-medium rounded-lg transition-all duration-200"
  >
    Cancelar
  </button>

  {/* Confirmar */}
  <button
    onClick={onConfirm}
    disabled={isSubmitting}
    className="inline-flex items-center justify-center gap-2 px-6 py-2 min-h-[44px] bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {isSubmitting ? 'Salvando...' : 'Salvar'}
  </button>
</div>
```

---

## 11. CHECKLIST DE IMPLEMENTAÇÃO

Ao criar ou atualizar um componente, verifique:

- [ ] Botões têm `min-h-[44px]`
- [ ] Ícones têm tamanho correto (18px tabelas, 20px botões)
- [ ] Cores seguem o padrão (primary, danger, etc.)
- [ ] Transições aplicadas (`transition-all duration-200`)
- [ ] Estado disabled implementado
- [ ] Responsividade mobile-first
- [ ] Títulos em botões sem texto (`title` attribute)
- [ ] Gap consistente (`gap-2` para ícone+texto)
- [ ] Hover states aplicados
- [ ] Loading states quando necessário

---

## VERSÃO
**v1.0** - 24/11/2025
**Última atualização:** Criação do design system baseado em auditoria completa
