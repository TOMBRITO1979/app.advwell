# Padrões de Botões Mobile - AdvWell

## Cores por Função

### Ações Primárias
- **Novo/Criar**: `bg-primary-600 hover:bg-primary-700 text-white` (verde)
- **Salvar/Confirmar**: `bg-primary-600 hover:bg-primary-700 text-white` (verde)

### Ações Secundárias
- **Editar**: `bg-blue-600 hover:bg-blue-700 text-white`
- **Visualizar/Detalhes**: `bg-gray-600 hover:bg-gray-700 text-white`
- **Sincronizar/Atualizar**: `bg-blue-600 hover:bg-blue-700 text-white`
- **Testar/Enviar**: `bg-blue-600 hover:bg-blue-700 text-white`

### Ações de Exportação
- **Exportar CSV**: `bg-green-600 hover:bg-green-700 text-white`
- **Exportar PDF**: `bg-red-600 hover:bg-red-700 text-white`

### Ações Destrutivas
- **Deletar/Excluir**: `bg-red-600 hover:bg-red-700 text-white`

### Ações Neutras
- **Cancelar**: `bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700`
- **Fechar**: `bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700`

## Classe Base para Todos os Botões

```tsx
className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"
```

## Padrão de Ícones

```tsx
<IconComponent size={18} className="sm:w-5 sm:h-5" />
```

## Texto Responsivo

```tsx
{/* Texto completo no desktop */}
<span className="hidden sm:inline">Texto Completo</span>

{/* Texto abreviado no mobile */}
<span className="sm:hidden">Abrev</span>
```

### Exemplos de Abreviações

- Novo Cliente → Novo
- Novo Processo → Novo
- Nova Tarefa → Nova
- Exportar CSV → CSV
- Exportar PDF → PDF
- Sincronizar → Sync
- Visualizar → Ver
- Detalhes → Info
- Editar → Editar (mantém)
- Excluir → Del
- Cancelar → Cancelar (mantém)
- Salvar → Salvar (mantém)

## Exemplo Completo de Botão

```tsx
{/* Botão Novo Cliente */}
<button
  onClick={handleNewClient}
  className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"
>
  <Plus size={18} className="sm:w-5 sm:h-5" />
  <span className="hidden sm:inline">Novo Cliente</span>
  <span className="sm:hidden">Novo</span>
</button>

{/* Botão Editar */}
<button
  onClick={handleEdit}
  className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"
>
  <Edit2 size={18} className="sm:w-5 sm:h-5" />
  <span>Editar</span>
</button>

{/* Botão Excluir */}
<button
  onClick={handleDelete}
  className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"
>
  <Trash2 size={18} className="sm:w-5 sm:h-5" />
  <span className="hidden sm:inline">Excluir</span>
  <span className="sm:hidden">Del</span>
</button>
```

## Botões em Tabelas (Versão Compacta)

Para botões dentro de células de tabela, use versão menor sem texto:

```tsx
<button
  onClick={handleEdit}
  className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
  title="Editar"
>
  <Edit2 size={18} />
</button>
```
