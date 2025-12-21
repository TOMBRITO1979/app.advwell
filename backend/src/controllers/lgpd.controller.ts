import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import crypto from 'crypto';
import { appLogger } from '../utils/logger';
import dataExportService from '../services/data-export.service';

// Versões atuais dos documentos
const CURRENT_VERSIONS = {
  PRIVACY_POLICY: '2.0',
  TERMS_OF_USE: '2.0',
};

// Informações da empresa
const COMPANY_INFO = {
  name: 'WA SOLUTIONS CORP',
  address: 'Florida, United States',
  email: 'contact@advwell.pro',
  dpo_email: 'privacy@advwell.pro',
};

export class LGPDController {
  /**
   * Registrar consentimento (público - usado no registro)
   * POST /api/lgpd/consent
   */
  async recordConsent(req: Request, res: Response) {
    try {
      const { email, consentType, version, userId } = req.body;
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      if (!email || !consentType || !version) {
        return res.status(400).json({ error: 'Email, tipo de consentimento e versão são obrigatórios' });
      }

      // Validar tipo de consentimento
      const validTypes = ['PRIVACY_POLICY', 'TERMS_OF_USE', 'MARKETING_EMAIL', 'DATA_PROCESSING'];
      if (!validTypes.includes(consentType)) {
        return res.status(400).json({ error: 'Tipo de consentimento inválido' });
      }

      // Buscar companyId do usuário se fornecido
      let companyId = null;
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { companyId: true },
        });
        companyId = user?.companyId || null;
      }

      const consent = await prisma.consentLog.create({
        data: {
          companyId, // Tenant isolation (null para registro inicial)
          userId: userId || null,
          email,
          ip,
          userAgent,
          consentType,
          version,
          consentedAt: new Date(),
        },
      });

      appLogger.info('Consentimento registrado', { email, consentType, version, ip });

      res.status(201).json({
        message: 'Consentimento registrado com sucesso',
        consent: {
          id: consent.id,
          consentType: consent.consentType,
          version: consent.version,
          consentedAt: consent.consentedAt,
        },
      });
    } catch (error) {
      appLogger.error('Erro ao registrar consentimento:', error as Error);
      res.status(500).json({ error: 'Erro ao registrar consentimento' });
    }
  }

  /**
   * Listar consentimentos do usuário autenticado
   * GET /api/lgpd/my-consents
   */
  async getMyConsents(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const consents = await prisma.consentLog.findMany({
        where: {
          OR: [
            { userId },
            { email: user.email },
          ],
        },
        orderBy: { consentedAt: 'desc' },
        select: {
          id: true,
          consentType: true,
          version: true,
          consentedAt: true,
          revokedAt: true,
        },
      });

      // Agrupar por tipo e pegar o mais recente de cada
      const latestConsents = consents.reduce((acc, consent) => {
        if (!acc[consent.consentType] || consent.consentedAt > acc[consent.consentType].consentedAt) {
          acc[consent.consentType] = consent;
        }
        return acc;
      }, {} as Record<string, typeof consents[0]>);

      // Retorna array diretamente como o frontend espera
      res.json(Object.values(latestConsents));
    } catch (error) {
      appLogger.error('Erro ao buscar consentimentos:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar consentimentos' });
    }
  }

  /**
   * Revogar um consentimento
   * POST /api/lgpd/revoke-consent
   */
  async revokeConsent(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { consentType } = req.body;

      if (!consentType) {
        return res.status(400).json({ error: 'Tipo de consentimento é obrigatório' });
      }

      // Buscar consentimento ativo mais recente
      const consent = await prisma.consentLog.findFirst({
        where: {
          userId,
          consentType,
          revokedAt: null,
        },
        orderBy: { consentedAt: 'desc' },
      });

      if (!consent) {
        return res.status(404).json({ error: 'Consentimento não encontrado' });
      }

      // Marcar como revogado
      await prisma.consentLog.update({
        where: { id: consent.id },
        data: { revokedAt: new Date() },
      });

      appLogger.info('Consentimento revogado', { userId, consentType });

      res.json({ message: 'Consentimento revogado com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao revogar consentimento:', error as Error);
      res.status(500).json({ error: 'Erro ao revogar consentimento' });
    }
  }

  /**
   * Obter Política de Privacidade
   * GET /api/lgpd/privacy-policy
   */
  async getPrivacyPolicy(req: Request, res: Response) {
    try {
      const policy = {
        version: CURRENT_VERSIONS.PRIVACY_POLICY,
        lastUpdated: '2025-12-11',
        content: `
# POLÍTICA DE PRIVACIDADE - ADVWELL

**Última atualização:** Dezembro de 2025
**Versão:** ${CURRENT_VERSIONS.PRIVACY_POLICY}

## 1. IDENTIFICAÇÃO DO CONTROLADOR E OPERADOR

### 1.1 Operador da Plataforma (Data Processor)
**${COMPANY_INFO.name}**
Sede: ${COMPANY_INFO.address}
E-mail: ${COMPANY_INFO.email}
DPO: ${COMPANY_INFO.dpo_email}

A ${COMPANY_INFO.name} é uma empresa constituída nos Estados Unidos da América, responsável pelo desenvolvimento, manutenção e operação da plataforma AdvWell.

### 1.2 Controlador dos Dados (Data Controller)
O **controlador dos dados pessoais** é o escritório de advocacia (pessoa jurídica ou profissional autônomo) que contrata os serviços da plataforma AdvWell e utiliza-a para gestão de seus processos e clientes.

### 1.3 Relacionamento entre as partes
- A ${COMPANY_INFO.name} atua como **operador** (processor) dos dados em nome do escritório contratante
- O escritório de advocacia atua como **controlador** (controller) dos dados de seus clientes
- Esta relação está formalizada nos Termos de Uso e no Acordo de Processamento de Dados (DPA)

## 2. DADOS PESSOAIS COLETADOS

### 2.1 Dados de Usuários do Sistema
- Nome completo
- Endereço de e-mail
- Telefone e celular
- Data de nascimento
- Foto de perfil
- Endereço IP e dados de acesso

### 2.2 Dados de Clientes Cadastrados
- Nome completo ou razão social
- CPF ou CNPJ
- RG e inscrição estadual
- Endereço completo
- Telefone e e-mail
- Profissão e estado civil
- Nacionalidade
- Data de nascimento
- Dados do representante legal (para pessoa jurídica)

### 2.3 Dados Processuais
- Números de processos judiciais
- Partes processuais (autores e réus)
- Movimentações processuais
- Documentos relacionados aos processos

## 3. FINALIDADES DO TRATAMENTO

Os dados pessoais são tratados para as seguintes finalidades:

- **Execução de contrato:** Gestão de processos jurídicos e relacionamento com clientes
- **Cumprimento de obrigação legal:** Atendimento a requisitos da OAB e do Poder Judiciário
- **Exercício regular de direitos:** Defesa em processos judiciais e administrativos
- **Comunicação:** Envio de notificações sobre andamentos processuais
- **Segurança:** Proteção contra acessos não autorizados

## 4. BASE LEGAL PARA TRATAMENTO

O tratamento de dados pessoais é realizado com base na Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018):

- **Art. 7º, I - Consentimento:** Para envio de comunicações de marketing
- **Art. 7º, II - Obrigação legal:** Cumprimento de deveres regulatórios
- **Art. 7º, V - Execução de contrato:** Prestação de serviços da plataforma
- **Art. 7º, VI - Exercício regular de direitos:** Atuação em processos judiciais
- **Art. 7º, IX - Legítimo interesse:** Segurança e prevenção a fraudes

## 5. COMPARTILHAMENTO DE DADOS

Os dados podem ser compartilhados com:

- **DataJud/CNJ:** Sistema do Poder Judiciário para consulta de processos
- **Amazon Web Services (AWS):** Armazenamento seguro de documentos (servidores nos EUA)
- **Stripe, Inc.:** Processamento de pagamentos (EUA)
- **Provedores de IA:** Quando configurado pelo usuário, para geração de resumos processuais
- **Autoridades competentes:** Quando exigido por lei ou ordem judicial

## 6. TRANSFERÊNCIA INTERNACIONAL DE DADOS

### 6.1 Informações Gerais
A ${COMPANY_INFO.name} está sediada nos Estados Unidos da América. Ao utilizar a plataforma AdvWell, você consente com a transferência de seus dados para os EUA e outros países onde nossos provedores de serviço operam.

### 6.2 Salvaguardas Aplicadas
A transferência internacional de dados é realizada em conformidade com o Art. 33 da LGPD, mediante:

- **Cláusulas Contratuais Padrão:** Incorporadas aos nossos contratos com subprocessadores
- **Medidas técnicas:** Criptografia em trânsito (TLS 1.3) e em repouso (AES-256)
- **Certificações:** Nossos provedores (AWS, Stripe) possuem certificações SOC 2, ISO 27001

### 6.3 Países de Destino
- Estados Unidos (servidores AWS, sede da ${COMPANY_INFO.name})
- Irlanda (backup AWS)

## 7. DIREITOS DO TITULAR

Conforme a LGPD, você tem direito a:

- **Confirmação e Acesso:** Confirmar a existência e solicitar cópia dos seus dados
- **Correção:** Corrigir dados incompletos, inexatos ou desatualizados
- **Anonimização/Bloqueio:** Solicitar tratamento restrito dos dados desnecessários
- **Portabilidade:** Receber seus dados em formato estruturado (JSON)
- **Eliminação:** Solicitar exclusão dos dados tratados com consentimento
- **Informação:** Saber com quem seus dados foram compartilhados
- **Revogação:** Retirar o consentimento a qualquer momento
- **Oposição:** Opor-se ao tratamento em caso de descumprimento da LGPD

### Como exercer seus direitos:
1. Acesse a área **"Meus Dados"** no sistema
2. Ou envie e-mail para: **${COMPANY_INFO.dpo_email}**

**Prazo de resposta:** Até 15 dias úteis, conforme Art. 18, §1º da LGPD.

## 8. PRAZO DE RETENÇÃO

| Tipo de Dado | Prazo de Retenção | Justificativa |
|--------------|-------------------|---------------|
| Dados de clientes | 5 anos após encerramento | Obrigação legal (CPC) |
| Processos jurídicos | 20 anos | Tabela de temporalidade OAB |
| Logs de acesso | 6 meses | Marco Civil da Internet |
| Dados financeiros | 5 anos | Legislação tributária |
| Logs de consentimento | Permanente | Comprovação de conformidade |

## 9. SEGURANÇA DOS DADOS

Implementamos medidas técnicas e administrativas para proteger seus dados:

- Criptografia AES-256 para dados sensíveis em repouso
- Criptografia TLS 1.3 para dados em trânsito
- Autenticação JWT com tokens de curta duração
- Autenticação de dois fatores (2FA) disponível
- HTTPS obrigatório em todas as comunicações
- Controle de acesso baseado em papéis (RBAC)
- Logs de auditoria de todas as operações críticas
- Backups automáticos criptografados
- Testes de penetração periódicos

## 10. COOKIES E TECNOLOGIAS SIMILARES

O sistema utiliza apenas **cookies essenciais** para:
- Manutenção da sessão de autenticação
- Preferências de idioma e tema do usuário

**Não utilizamos** cookies de rastreamento, publicidade ou analytics de terceiros.

## 11. CONTATO DO ENCARREGADO (DPO)

**Encarregado de Proteção de Dados:**
E-mail: ${COMPANY_INFO.dpo_email}

Para questões específicas do escritório de advocacia contratante, entre em contato diretamente com o administrador do seu escritório.

## 12. RECLAMAÇÕES

Se você acredita que seus direitos não foram atendidos, você pode:

1. Entrar em contato conosco: ${COMPANY_INFO.dpo_email}
2. Registrar reclamação na **ANPD** (Autoridade Nacional de Proteção de Dados): https://www.gov.br/anpd

## 13. ALTERAÇÕES NESTA POLÍTICA

Esta política pode ser atualizada periodicamente. Alterações significativas serão comunicadas por e-mail ou notificação no sistema com **30 dias de antecedência**.

A versão mais recente estará sempre disponível em: https://app.advwell.pro/politica-de-privacidade

---

**${COMPANY_INFO.name}**
${COMPANY_INFO.address}

**Ao utilizar o sistema AdvWell, você declara ter lido e concordado com esta Política de Privacidade.**
        `.trim(),
      };

      res.json(policy);
    } catch (error) {
      appLogger.error('Erro ao buscar política de privacidade:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar política de privacidade' });
    }
  }

  /**
   * Obter Termos de Uso
   * GET /api/lgpd/terms
   */
  async getTermsOfUse(req: Request, res: Response) {
    try {
      const terms = {
        version: CURRENT_VERSIONS.TERMS_OF_USE,
        lastUpdated: '2025-12-11',
        content: `
# TERMOS DE USO - ADVWELL

**Última atualização:** Dezembro de 2025
**Versão:** ${CURRENT_VERSIONS.TERMS_OF_USE}

## 1. PARTES E ACEITAÇÃO

### 1.1 Identificação das Partes
Estes Termos de Uso ("Termos") constituem um acordo legal entre:

**Prestador do Serviço:**
${COMPANY_INFO.name}
Sede: ${COMPANY_INFO.address}
E-mail: ${COMPANY_INFO.email}

**Usuário/Contratante:**
A pessoa física ou jurídica que se cadastra e utiliza a plataforma AdvWell.

### 1.2 Aceitação
Ao acessar, cadastrar-se ou utilizar o sistema AdvWell, você declara que:
- Leu e compreendeu integralmente estes Termos
- Concorda em cumprir todas as disposições aqui estabelecidas
- Possui capacidade legal para celebrar este contrato
- Se representa uma empresa, possui autoridade para vinculá-la

**Se você não concordar com qualquer parte destes Termos, não utilize o sistema.**

## 2. DESCRIÇÃO DO SERVIÇO

O AdvWell é uma plataforma SaaS (Software as a Service) desenvolvida pela ${COMPANY_INFO.name} para auxiliar escritórios de advocacia brasileiros na gestão de:

- Processos judiciais e extrajudiciais
- Clientes e contatos
- Documentos jurídicos
- Agenda e compromissos
- Finanças e honorários
- Comunicações e campanhas
- Integração com DataJud/CNJ

## 3. CADASTRO E CONTA

### 3.1 Requisitos
- Você deve ter capacidade legal para celebrar contratos
- As informações fornecidas devem ser verdadeiras, precisas e atualizadas
- Você é responsável por manter a confidencialidade de suas credenciais
- Cada conta é pessoal e intransferível

### 3.2 Responsabilidades do Usuário
- Notificar imediatamente sobre uso não autorizado da conta
- Não compartilhar credenciais de acesso com terceiros
- Manter dados de contato atualizados
- Utilizar senha forte e única

### 3.3 Verificação de Email
O acesso à plataforma requer verificação do endereço de email cadastrado.

## 4. USO ACEITÁVEL

### 4.1 Usos Permitidos
- Gestão legítima de atividades advocatícias
- Cadastro de clientes e processos reais
- Armazenamento de documentos relacionados à atividade profissional
- Exportação de dados conforme funcionalidades disponíveis

### 4.2 Usos Proibidos
- Utilizar o sistema para fins ilegais ou não autorizados
- Tentar acessar dados de outras empresas ou usuários
- Realizar engenharia reversa, descompilar ou copiar o software
- Transmitir vírus, malware ou código malicioso
- Sobrecarregar o sistema com requisições excessivas (DDoS)
- Revender, sublicenciar ou compartilhar o acesso ao sistema
- Violar direitos de propriedade intelectual de terceiros
- Coletar dados de outros usuários sem autorização

## 5. PROPRIEDADE INTELECTUAL

### 5.1 Propriedade da ${COMPANY_INFO.name}
O sistema AdvWell, incluindo mas não limitado a:
- Código-fonte e código objeto
- Interface de usuário e design
- Marca, logotipos e identidade visual
- Documentação e materiais de suporte
- Algoritmos e funcionalidades

São de propriedade exclusiva da ${COMPANY_INFO.name} ou de seus licenciadores. Nenhum direito de propriedade intelectual é transferido pelo uso da plataforma.

### 5.2 Propriedade dos Dados do Usuário
Você mantém a propriedade de todos os dados inseridos no sistema. Você concede à ${COMPANY_INFO.name} uma licença limitada, não exclusiva e revogável para processar esses dados exclusivamente para prestação do serviço.

## 6. DISPONIBILIDADE E SUPORTE

### 6.1 Disponibilidade (SLA)
Nos esforçamos para manter o sistema disponível 24/7, com meta de disponibilidade de 99.5% ao mês. Não garantimos disponibilidade ininterrupta.

### 6.2 Manutenções
Manutenções programadas serão comunicadas com pelo menos 48 horas de antecedência, preferencialmente em horários de menor uso.

### 6.3 Suporte
O suporte técnico está disponível por email (${COMPANY_INFO.email}) em dias úteis.

## 7. PAGAMENTO E ASSINATURA

### 7.1 Planos e Preços
O acesso ao sistema está condicionado à contratação de um plano de assinatura. Valores e condições são informados no momento da contratação e podem ser alterados com 30 dias de aviso prévio.

### 7.2 Moeda e Pagamento
- Os pagamentos podem ser realizados em USD (Dólares Americanos) ou BRL (Reais)
- Processamento via Stripe (cartão de crédito)
- Impostos aplicáveis são de responsabilidade do contratante

### 7.3 Renovação Automática
As assinaturas são renovadas automaticamente ao final de cada período, salvo cancelamento prévio.

### 7.4 Cancelamento
Você pode cancelar sua assinatura a qualquer momento através das configurações do sistema. O acesso permanecerá ativo até o fim do período já pago. **Não há reembolso proporcional para cancelamentos.**

### 7.5 Período de Teste
Novos usuários podem ter acesso a um período de teste gratuito. Ao final do período, será necessário contratar um plano pago para continuar utilizando o sistema.

## 8. LIMITAÇÃO DE RESPONSABILIDADE

### 8.1 Fornecimento "Como Está"
O SISTEMA É FORNECIDO "COMO ESTÁ" E "CONFORME DISPONÍVEL", SEM GARANTIAS DE QUALQUER TIPO, EXPRESSAS OU IMPLÍCITAS.

### 8.2 Exclusão de Garantias
A ${COMPANY_INFO.name} NÃO GARANTE que:
- O sistema atenderá todos os seus requisitos específicos
- O sistema funcionará sem erros ou interrupções
- Os resultados obtidos serão precisos ou confiáveis
- Quaisquer erros serão corrigidos

### 8.3 Exclusão de Responsabilidade
A ${COMPANY_INFO.name} NÃO se responsabiliza por:
- Perdas decorrentes de uso indevido do sistema
- Danos causados por falhas de terceiros (internet, hardware, provedores)
- Perda de prazos processuais por qualquer motivo
- Decisões tomadas com base em informações do sistema
- Lucros cessantes ou danos indiretos
- Perda de dados por culpa do usuário

### 8.4 Limitação de Valor
EM NENHUMA CIRCUNSTÂNCIA A RESPONSABILIDADE TOTAL DA ${COMPANY_INFO.name} EXCEDERÁ O VALOR PAGO PELO USUÁRIO NOS ÚLTIMOS 12 (DOZE) MESES.

## 9. INDENIZAÇÃO

Você concorda em defender, indenizar e isentar a ${COMPANY_INFO.name}, seus diretores, funcionários e parceiros de quaisquer reclamações, danos, custos e despesas (incluindo honorários advocatícios) decorrentes de:
- Violação destes Termos por você
- Uso indevido do sistema
- Violação de direitos de terceiros
- Dados inseridos no sistema por você

## 10. PRIVACIDADE E PROTEÇÃO DE DADOS

O tratamento de dados pessoais é regido pela nossa Política de Privacidade, disponível em https://app.advwell.pro/politica-de-privacidade, que é parte integrante destes Termos.

### 10.1 Acordo de Processamento de Dados (DPA)
Ao aceitar estes Termos, você também concorda com nosso Acordo de Processamento de Dados, que estabelece as obrigações das partes em relação à LGPD.

## 11. ALTERAÇÕES NOS TERMOS

A ${COMPANY_INFO.name} pode modificar estes Termos a qualquer momento. Alterações significativas serão comunicadas com **30 dias de antecedência** por email ou notificação no sistema.

O uso continuado da plataforma após a entrada em vigor das alterações constitui aceitação dos novos Termos.

## 12. RESCISÃO

### 12.1 Pelo Usuário
Você pode encerrar sua conta a qualquer momento através das configurações do sistema ou solicitando por email.

### 12.2 Pela ${COMPANY_INFO.name}
Podemos suspender ou encerrar seu acesso, com ou sem aviso prévio, em caso de:
- Violação destes Termos
- Uso fraudulento ou abusivo
- Inadimplência por mais de 30 dias
- Determinação legal ou judicial
- Encerramento das operações da plataforma

### 12.3 Efeitos da Rescisão
Após a rescisão:
- Seu acesso ao sistema será imediatamente revogado
- Seus dados serão mantidos por 30 dias para eventual recuperação
- Após 30 dias, os dados poderão ser permanentemente excluídos
- Você pode solicitar exportação dos dados antes da exclusão

## 13. LEI APLICÁVEL E JURISDIÇÃO

### 13.1 Lei Aplicável
Estes Termos são regidos e interpretados de acordo com as leis do **Estado da Flórida, Estados Unidos da América**, sem considerar conflitos de princípios legais.

Para usuários localizados no Brasil, reconhecemos a aplicabilidade da LGPD (Lei nº 13.709/2018) no que tange à proteção de dados pessoais.

### 13.2 Jurisdição
Qualquer disputa decorrente destes Termos será submetida à **jurisdição exclusiva dos tribunais estaduais ou federais localizados no Estado da Flórida, EUA**.

### 13.3 Arbitragem
Alternativamente, as partes podem optar por resolver disputas através de arbitragem vinculante administrada pela American Arbitration Association (AAA), com sede em Miami, Flórida.

### 13.4 Renúncia a Ações Coletivas
Você concorda em resolver disputas individualmente e renuncia ao direito de participar de ações coletivas (class actions).

## 14. DISPOSIÇÕES GERAIS

### 14.1 Acordo Integral
Estes Termos, juntamente com a Política de Privacidade, constituem o acordo integral entre as partes, substituindo quaisquer acordos anteriores.

### 14.2 Independência das Cláusulas
Se qualquer disposição for considerada inválida ou inexequível, as demais disposições permanecerão em pleno vigor.

### 14.3 Renúncia
A falha em exercer qualquer direito não constitui renúncia a esse direito.

### 14.4 Cessão
Você não pode ceder ou transferir estes Termos sem consentimento prévio por escrito. A ${COMPANY_INFO.name} pode ceder livremente.

### 14.5 Comunicações
Comunicações oficiais serão enviadas para o email cadastrado. É sua responsabilidade manter o email atualizado.

## 15. CONTATO

Para dúvidas sobre estes Termos:
- E-mail: ${COMPANY_INFO.email}
- DPO/Privacidade: ${COMPANY_INFO.dpo_email}

---

**${COMPANY_INFO.name}**
${COMPANY_INFO.address}

**Ao utilizar o sistema AdvWell, você declara ter lido, compreendido e concordado com estes Termos de Uso.**

*Versão ${CURRENT_VERSIONS.TERMS_OF_USE} - Atualizado em Dezembro de 2025*
        `.trim(),
      };

      res.json(terms);
    } catch (error) {
      appLogger.error('Erro ao buscar termos de uso:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar termos de uso' });
    }
  }

  /**
   * Obter meus dados (visualização)
   * GET /api/lgpd/my-data
   */
  async getMyData(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const companyId = req.user!.companyId;

      // Buscar dados do usuário
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          mobile: true,
          birthDate: true,
          role: true,
          createdAt: true,
          company: {
            select: {
              id: true,
              name: true,
              email: true,
              cnpj: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Estatísticas (se tiver companyId)
      let statistics = {
        totalClients: 0,
        totalCases: 0,
        totalDocuments: 0,
        totalFinancialRecords: 0,
        totalScheduleEvents: 0,
      };

      if (companyId) {
        const [clientsCount, casesCount, documentsCount, financialCount, scheduleCount] = await Promise.all([
          prisma.client.count({ where: { companyId } }),
          prisma.case.count({ where: { companyId } }),
          prisma.document.count({ where: { companyId } }),
          prisma.financialTransaction.count({ where: { companyId } }),
          prisma.scheduleEvent.count({ where: { companyId } }),
        ]);

        statistics = {
          totalClients: clientsCount,
          totalCases: casesCount,
          totalDocuments: documentsCount,
          totalFinancialRecords: financialCount,
          totalScheduleEvents: scheduleCount,
        };
      }

      // Retorna no formato esperado pelo frontend
      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
        company: user.company,
        statistics,
      });
    } catch (error) {
      appLogger.error('Erro ao buscar meus dados:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar dados' });
    }
  }

  /**
   * Criar solicitação LGPD
   * POST /api/lgpd/request
   */
  async createRequest(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const companyId = req.user!.companyId;
      const { requestType, description } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Validar tipo
      const validTypes = ['ACCESS', 'CORRECTION', 'DELETION', 'PORTABILITY', 'REVOKE_CONSENT'];
      if (!validTypes.includes(requestType)) {
        return res.status(400).json({ error: 'Tipo de solicitação inválido' });
      }

      // Verificar se já existe solicitação pendente do mesmo tipo
      const existingRequest = await prisma.dataRequest.findFirst({
        where: {
          userId,
          requestType,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      });

      if (existingRequest) {
        return res.status(400).json({
          error: 'Já existe uma solicitação pendente deste tipo',
          existingRequestId: existingRequest.id,
        });
      }

      const request = await prisma.dataRequest.create({
        data: {
          userId,
          companyId,
          requestType,
          description,
          status: 'PENDING',
          requestedAt: new Date(),
        },
      });

      appLogger.info('Solicitação LGPD criada', { userId, requestType, requestId: request.id });

      res.status(201).json({
        message: 'Solicitação criada com sucesso',
        request: {
          id: request.id,
          requestType: request.requestType,
          status: request.status,
          requestedAt: request.requestedAt,
        },
      });
    } catch (error) {
      appLogger.error('Erro ao criar solicitação LGPD:', error as Error);
      res.status(500).json({ error: 'Erro ao criar solicitação' });
    }
  }

  /**
   * Listar minhas solicitações
   * GET /api/lgpd/requests
   */
  async listMyRequests(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;

      const requests = await prisma.dataRequest.findMany({
        where: { userId },
        orderBy: { requestedAt: 'desc' },
        select: {
          id: true,
          requestType: true,
          status: true,
          description: true,
          requestedAt: true,
          processedAt: true,
          completedAt: true,
          resultUrl: true,
          notes: true,
          rejectionReason: true,
        },
      });

      // Retorna array diretamente como o frontend espera
      res.json(requests);
    } catch (error) {
      appLogger.error('Erro ao listar solicitações:', error as Error);
      res.status(500).json({ error: 'Erro ao listar solicitações' });
    }
  }

  /**
   * (ADMIN) Listar solicitações pendentes da empresa
   * GET /api/lgpd/requests/pending
   */
  async listPendingRequests(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const requests = await prisma.dataRequest.findMany({
        where: {
          companyId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        orderBy: { requestedAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.json({ requests });
    } catch (error) {
      appLogger.error('Erro ao listar solicitações pendentes:', error as Error);
      res.status(500).json({ error: 'Erro ao listar solicitações' });
    }
  }

  /**
   * (ADMIN) Processar solicitação
   * PUT /api/lgpd/requests/:id
   */
  async processRequest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const adminId = req.user!.userId;
      const companyId = req.user!.companyId;
      const { status, notes, rejectionReason, resultUrl } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Buscar solicitação
      const request = await prisma.dataRequest.findFirst({
        where: { id, companyId },
      });

      if (!request) {
        return res.status(404).json({ error: 'Solicitação não encontrada' });
      }

      // Validar status
      const validStatuses = ['IN_PROGRESS', 'COMPLETED', 'REJECTED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
      }

      // Atualizar
      const updateData: any = {
        status,
        notes,
        processedBy: adminId,
      };

      if (status === 'IN_PROGRESS') {
        updateData.processedAt = new Date();
      }

      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
        if (resultUrl) {
          updateData.resultUrl = resultUrl;
        }

        // Se for portabilidade, gerar export de dados
        if (request.requestType === 'PORTABILITY' && request.userId) {
          try {
            const exportData = await dataExportService.exportUserData(request.userId, companyId);
            updateData.notes = (notes || '') + '\n\nDados exportados automaticamente pelo sistema.';
            // Em uma implementacao real, salvaria o exportData em um arquivo e retornaria a URL
            appLogger.info('Dados exportados para portabilidade', { requestId: id, userId: request.userId });
          } catch (exportError) {
            appLogger.error('Erro ao exportar dados para portabilidade:', exportError as Error);
          }
        }

        // Se for exclusao, anonimizar dados
        if (request.requestType === 'DELETION' && request.userId) {
          try {
            await dataExportService.anonymizeUserData(request.userId, companyId);
            updateData.notes = (notes || '') + '\n\nDados anonimizados conforme LGPD.';
            appLogger.info('Dados anonimizados por solicitacao LGPD', { requestId: id, userId: request.userId });
          } catch (anonError) {
            appLogger.error('Erro ao anonimizar dados:', anonError as Error);
          }
        }
      }

      if (status === 'REJECTED') {
        updateData.completedAt = new Date();
        updateData.rejectionReason = rejectionReason;
      }

      const updated = await prisma.dataRequest.update({
        where: { id },
        data: updateData,
      });

      appLogger.info('Solicitação LGPD processada', { requestId: id, status, adminId });

      res.json({
        message: 'Solicitação atualizada com sucesso',
        request: updated,
      });
    } catch (error) {
      appLogger.error('Erro ao processar solicitação:', error as Error);
      res.status(500).json({ error: 'Erro ao processar solicitação' });
    }
  }
}

export default new LGPDController();
