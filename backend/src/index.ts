import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import routes from './routes';
import cron from 'node-cron';
import prisma from './utils/prisma';
import datajudService from './services/datajud.service';

const app = express();

// Trust proxy - necessário quando atrás de Traefik/Nginx
// Configurado para 1 proxy (Traefik)
app.set('trust proxy', 1);

// CORS deve vir antes do helmet
app.use(cors({
  origin: [config.urls.frontend, 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middlewares de segurança - configurado para permitir CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false, // Desabilita validação do trust proxy
  },
});
app.use('/api/', limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    name: 'AdvTom API',
    version: '1.0.0',
    status: 'running'
  });
});

// Erro 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Cron job para sincronizar processos diariamente às 2h da manhã
cron.schedule('0 2 * * *', async () => {
  console.log('Iniciando sincronização automática de processos...');

  try {
    const cases = await prisma.case.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        processNumber: true,
      },
    });

    for (const caseData of cases) {
      try {
        const datajudData = await datajudService.searchCaseAllTribunals(
          caseData.processNumber
        );

        if (datajudData?.movimentos) {
          // Deleta movimentações antigas
          await prisma.caseMovement.deleteMany({
            where: { caseId: caseData.id },
          });

          // Cria as novas movimentações
          await prisma.caseMovement.createMany({
            data: datajudData.movimentos.map((mov) => ({
              caseId: caseData.id,
              movementCode: mov.codigo,
              movementName: mov.nome,
              movementDate: new Date(mov.dataHora),
              description: mov.complementosTabelados
                ?.map((c) => `${c.nome}: ${c.descricao}`)
                .join('; '),
            })),
          });

          // Atualiza a data de sincronização
          await prisma.case.update({
            where: { id: caseData.id },
            data: { lastSyncedAt: new Date() },
          });

          console.log(`Processo ${caseData.processNumber} sincronizado com sucesso`);
        }
      } catch (error) {
        console.error(`Erro ao sincronizar processo ${caseData.processNumber}:`, error);
      }
    }

    console.log('Sincronização automática concluída');
  } catch (error) {
    console.error('Erro na sincronização automática:', error);
  }
});

// Iniciar servidor
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 Ambiente: ${config.nodeEnv}`);
  console.log(`🔗 API URL: ${config.urls.api}`);
});

export default app;
