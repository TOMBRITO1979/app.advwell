-- Migration: Converter Float para Decimal em campos monetários
-- Motivo: Float pode causar erros de arredondamento em valores monetários
-- Solução: Usar DECIMAL(15,2) para precisão de 2 casas decimais

-- Cases: valor da causa
ALTER TABLE "cases" ALTER COLUMN "value" TYPE DECIMAL(15,2);

-- FinancialTransactions: valor da transação
ALTER TABLE "financial_transactions" ALTER COLUMN "amount" TYPE DECIMAL(15,2);

-- InstallmentPayments: valor da parcela
ALTER TABLE "installment_payments" ALTER COLUMN "amount" TYPE DECIMAL(15,2);
ALTER TABLE "installment_payments" ALTER COLUMN "paidAmount" TYPE DECIMAL(15,2);

-- AccountsPayable: valor da conta
ALTER TABLE "accounts_payable" ALTER COLUMN "amount" TYPE DECIMAL(15,2);

-- ServicePlans: preço do plano
ALTER TABLE "service_plans" ALTER COLUMN "price" TYPE DECIMAL(15,2);

-- SubscriptionPayments: valor do pagamento
ALTER TABLE "subscription_payments" ALTER COLUMN "amount" TYPE DECIMAL(15,2);
