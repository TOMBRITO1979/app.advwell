import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { upload } from '../middleware/upload';
import {
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getFinancialSummary,
  exportPDF,
  exportCSV,
  importCSV,
  listInstallments,
  updateInstallment,
  generateInstallmentReceipt,
} from '../controllers/financial.controller';

const router = Router();

// Aplicar autenticação e validação de tenant em todas as rotas
router.use(authenticate, validateTenant);

// Middleware de validação genérico
const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: errors.array()
    });
  }
  next();
};

// Validações para criação de transação financeira
const createTransactionValidation = [
  body('type')
    .notEmpty()
    .isIn(['INCOME', 'EXPENSE'])
    .withMessage('Tipo deve ser INCOME ou EXPENSE'),
  body('description')
    .trim()
    .isLength({ min: 2, max: 500 })
    .withMessage('Descrição deve ter entre 2 e 500 caracteres'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Valor deve ser maior que zero'),
  body('clientId')
    .notEmpty()
    .isUUID()
    .withMessage('ID do cliente inválido'),
  body('caseId')
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('ID do processo inválido'),
  body('date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Data inválida'),
];

// Validações para atualização de transação financeira
const updateTransactionValidation = [
  body('type')
    .optional({ checkFalsy: true })
    .isIn(['INCOME', 'EXPENSE'])
    .withMessage('Tipo deve ser INCOME ou EXPENSE'),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 500 })
    .withMessage('Descrição deve ter entre 2 e 500 caracteres'),
  body('amount')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0.01 })
    .withMessage('Valor deve ser maior que zero'),
  body('clientId')
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('ID do cliente inválido'),
  body('caseId')
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('ID do processo inválido'),
  body('date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Data inválida'),
];

// Rotas de transações financeiras
router.get('/', listTransactions);                    // Listar transações com filtros
router.get('/summary', getFinancialSummary);          // Resumo financeiro
router.get('/export/pdf', exportPDF);                 // Exportar para PDF
router.get('/export/csv', exportCSV);                 // Exportar para CSV
router.post('/import/csv', upload.single('file'), importCSV); // Importar transações via CSV
router.get('/:id', getTransaction);                   // Buscar transação por ID
router.post('/', createTransactionValidation, validate, createTransaction);  // Criar nova transação
router.put('/:id', updateTransactionValidation, validate, updateTransaction); // Atualizar transação
router.delete('/:id', deleteTransaction);             // Excluir transação

// Rotas de parcelamento
router.get('/:transactionId/installments', listInstallments);           // Listar parcelas de uma transação
router.put('/installments/:installmentId', updateInstallment);          // Atualizar parcela
router.get('/installments/:installmentId/receipt', generateInstallmentReceipt); // Gerar PDF de recibo

export default router;
