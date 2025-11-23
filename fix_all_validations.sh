#!/bin/bash

echo "Corrigindo todas as validações..."

# Lista de arquivos para corrigir
files=(
  "/root/advtom/backend/src/routes/client.routes.ts"
  "/root/advtom/backend/src/routes/case.routes.ts"
  "/root/advtom/backend/src/routes/financial.routes.ts"
  "/root/advtom/backend/src/routes/document.routes.ts"
  "/root/advtom/backend/src/routes/schedule.routes.ts"
  "/root/advtom/backend/src/routes/user.routes.ts"
  "/root/advtom/backend/src/routes/accounts-payable.routes.ts"
  "/root/advtom/backend/src/routes/auth.routes.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processando: $file"
    # Substitui .optional() por .optional({ checkFalsy: true })
    sed -i 's/\.optional()/\.optional({ checkFalsy: true })/g' "$file"
    echo "  ✓ Concluído"
  else
    echo "  ⚠ Arquivo não encontrado: $file"
  fi
done

echo ""
echo "✅ Todas as validações corrigidas!"
