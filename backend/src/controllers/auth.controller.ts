import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { generateToken, generateResetToken, generateSimpleToken, generateTokenPair, verifyRefreshToken, blacklistToken, invalidateAllUserTokens } from '../utils/jwt';
import { sendPasswordResetEmail, sendWelcomeEmail, sendEmailVerification } from '../utils/email';
import { AuthRequest } from '../middleware/auth';
import { securityLogger, appLogger } from '../utils/logger';
import { TRIAL_DURATION_DAYS } from '../services/stripe.service';
import { sendTelegramMessage } from '../services/telegram.service';
import { config } from '../config';

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { name, email, password, companyName, cnpj, consents } = req.body;

      // Verifica se o email já existe (globalmente para registro de novas empresas)
      const existingUser = await prisma.user.findFirst({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Email já cadastrado' });
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 12);

      // Gera token de verificação de email (válido por 24 horas)
      const emailVerificationToken = generateSimpleToken();
      const emailVerificationExpiry = new Date(Date.now() + 86400000); // 24 horas

      // Calculate trial end date
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS);

      // Captura IP e User-Agent para registro de consentimento LGPD
      const clientIp = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      // Cria a empresa e o usuário admin em uma transação
      const result = await prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: {
            name: companyName,
            cnpj,
            email,
            subscriptionStatus: 'TRIAL',
            trialEndsAt,
            casesLimit: 1000, // Trial has Bronze limit
          },
        });

        const user = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            role: 'ADMIN',
            companyId: company.id,
            emailVerified: false,
            emailVerificationToken,
            emailVerificationExpiry,
          },
        });

        // Registra os consentimentos LGPD se fornecidos
        if (consents && Array.isArray(consents)) {
          for (const consent of consents) {
            await tx.consentLog.create({
              data: {
                userId: user.id,
                email: email,
                ip: clientIp,
                userAgent: userAgent,
                consentType: consent.type,
                version: consent.version || '1.0',
              },
            });
          }
        }

        return { company, user };
      });

      // Envia email de verificação
      try {
        appLogger.info('Enviando email de verificação', { email });
        await sendEmailVerification(email, name, emailVerificationToken);
        appLogger.info('Email de verificação enviado com sucesso', { email });
      } catch (error: any) {
        appLogger.error('Erro ao enviar email de verificação', error as Error, { email });
        // Logged above
      }

      // Notifica SUPER_ADMINs via Telegram sobre novo cadastro
      try {
        const botToken = config.telegram.defaultBotToken;
        if (botToken) {
          const superAdmins = await prisma.user.findMany({
            where: {
              role: 'SUPER_ADMIN',
              telegramChatId: { not: null },
            },
            select: { telegramChatId: true },
          });

          const message = `
<b>🆕 Novo Cadastro no AdvWell</b>

<b>Empresa:</b> ${companyName}
<b>Usuário:</b> ${name}
<b>Email:</b> ${email}
<b>CNPJ:</b> ${cnpj || 'Não informado'}
<b>Data:</b> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
          `.trim();

          for (const admin of superAdmins) {
            if (admin.telegramChatId) {
              await sendTelegramMessage(botToken, {
                chatId: admin.telegramChatId,
                text: message,
                parseMode: 'HTML',
              });
            }
          }
          appLogger.info('Notificação Telegram enviada para SUPER_ADMINs', { companyName, email });
        }
      } catch (error: any) {
        appLogger.error('Erro ao notificar SUPER_ADMINs via Telegram', error as Error);
        // Não bloqueia o registro se a notificação falhar
      }

      res.status(201).json({
        message: 'Cadastro realizado com sucesso! Por favor, verifique seu email para ativar sua conta.',
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          companyId: result.user.companyId,
          emailVerified: false,
        },
      });
    } catch (error) {
      appLogger.error('Erro no registro:', error as Error);
      res.status(500).json({ error: 'Erro ao criar conta' });
    }
  }

  /**
   * Busca informações da empresa pelo subdomain
   * GET /api/auth/company-by-subdomain/:subdomain
   *
   * Usado pelo portal de clientes para exibir logo e nome do escritório na tela de login
   */
  async getCompanyBySubdomain(req: Request, res: Response) {
    try {
      const { subdomain } = req.params;

      if (!subdomain) {
        return res.status(400).json({ error: 'Subdomínio não fornecido' });
      }

      // Validar formato do subdomain (apenas letras minúsculas, números e hífens)
      if (!/^[a-z0-9-]+$/.test(subdomain)) {
        return res.status(400).json({ error: 'Formato de subdomínio inválido' });
      }

      const company = await prisma.company.findUnique({
        where: { subdomain },
        select: {
          id: true,
          name: true,
          logo: true,
          active: true,
        },
      });

      if (!company) {
        return res.status(404).json({ error: 'Escritório não encontrado' });
      }

      if (!company.active) {
        return res.status(404).json({ error: 'Escritório não encontrado' });
      }

      res.json({
        id: company.id,
        name: company.name,
        logo: company.logo,
      });
    } catch (error) {
      appLogger.error('Erro ao buscar empresa por subdomain:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar informações do escritório' });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password, subdomain } = req.body;

      let user;

      if (subdomain) {
        // Login via portal de clientes (com subdomain)
        // Busca a empresa pelo subdomain primeiro
        const company = await prisma.company.findUnique({
          where: { subdomain },
        });

        if (!company) {
          return res.status(401).json({ error: 'Escritório não encontrado' });
        }

        if (!company.active) {
          return res.status(401).json({ error: 'Escritório inativo' });
        }

        // Busca usuário por email + companyId
        user = await prisma.user.findFirst({
          where: {
            email,
            companyId: company.id,
          },
          include: {
            company: true,
            linkedClient: true,
            permissions: {
              select: {
                resource: true,
                canView: true,
                canEdit: true,
                canDelete: true,
              },
            },
          },
        });
      } else {
        // Login normal (app.advwell.pro) - busca primeiro usuário com esse email
        // SUPER_ADMIN ou usuários únicos
        user = await prisma.user.findFirst({
          where: { email },
          include: {
            company: true,
            linkedClient: true,
            permissions: {
              select: {
                resource: true,
                canView: true,
                canEdit: true,
                canDelete: true,
              },
            },
          },
        });
      }

      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      if (!user.active) {
        return res.status(401).json({ error: 'Usuário inativo' });
      }

      if (!user.emailVerified) {
        return res.status(401).json({
          error: 'Email não verificado',
          message: 'Por favor, verifique seu email antes de fazer login. Verifique sua caixa de entrada e spam.'
        });
      }

      // Verificar se a conta está bloqueada
      if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
        const minutesLeft = Math.ceil((user.accountLockedUntil.getTime() - Date.now()) / 60000);
        return res.status(401).json({
          error: 'Conta bloqueada',
          message: `Conta bloqueada por múltiplas tentativas de login falhadas. Tente novamente em ${minutesLeft} minuto(s).`
        });
      }

      if (user.company && !user.company.active) {
        return res.status(401).json({ error: 'Empresa inativa' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        // Incrementar contador de tentativas falhadas
        const newAttempts = (user.failedLoginAttempts || 0) + 1;
        const updateData: any = {
          failedLoginAttempts: newAttempts,
          lastFailedLoginAt: new Date(),
        };

        // Bloquear conta se atingir 5 tentativas
        if (newAttempts >= 5) {
          const lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
          updateData.accountLockedUntil = lockUntil;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });

        if (newAttempts >= 5) {
          const lockUntil = updateData.accountLockedUntil;
          securityLogger.accountLocked(email, user.id, lockUntil, req.ip);

          return res.status(401).json({
            error: 'Conta bloqueada',
            message: 'Conta bloqueada por 15 minutos devido a múltiplas tentativas de login falhadas.'
          });
        }

        securityLogger.loginFailed(email, 'Senha incorreta', req.ip, newAttempts);

        return res.status(401).json({
          error: 'Credenciais inválidas',
          message: `Tentativa ${newAttempts} de 5. Após 5 tentativas, a conta será bloqueada por 15 minutos.`
        });
      }

      // Login bem-sucedido - resetar contador de tentativas falhadas
      if (user.failedLoginAttempts > 0 || user.accountLockedUntil) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lastFailedLoginAt: null,
            accountLockedUntil: null,
          },
        });
      }

      // Incluir clientId no token se for usuário CLIENT
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId || undefined,
        clientId: user.role === 'CLIENT' ? user.clientId || undefined : undefined,
      };

      const tokens = generateTokenPair(tokenPayload);

      securityLogger.loginSuccess(email, user.id, req.ip);

      // Resposta com dados adicionais para usuários CLIENT
      const responseUser: any = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company?.name,
        permissions: user.permissions,
      };

      // Adicionar informações do cliente vinculado se for CLIENT
      if (user.role === 'CLIENT' && user.linkedClient) {
        responseUser.clientId = user.clientId;
        responseUser.clientName = user.linkedClient.name;
        responseUser.isPortalUser = true;
      }

      res.json({
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: responseUser,
      });
    } catch (error) {
      appLogger.error('Erro no login:', error as Error);
      res.status(500).json({ error: 'Erro ao fazer login' });
    }
  }

  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      const user = await prisma.user.findFirst({
        where: { email },
      });

      if (!user) {
        // Por segurança, não revela se o email existe
        return res.json({ message: 'Se o email existir, um link de redefinição foi enviado' });
      }

      // TAREFA 2.2: Token com userId e nonce para seguranca
      const resetToken = generateResetToken(user.id);
      const resetTokenExpiry = new Date(Date.now() + 1800000); // 30 minutos (OWASP recomenda 15-30min)

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry,
        },
      });

      securityLogger.passwordResetRequested(email, req.ip);
      await sendPasswordResetEmail(email, resetToken);

      res.json({ message: 'Se o email existir, um link de redefinição foi enviado' });
    } catch (error) {
      appLogger.error('Erro ao solicitar reset:', error as Error);
      res.status(500).json({ error: 'Erro ao processar solicitação' });
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;

      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: {
            gt: new Date(),
          },
        },
      });

      if (!user) {
        return res.status(400).json({ error: 'Token inválido ou expirado' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      securityLogger.passwordResetCompleted(user.email, user.id, req.ip);

      res.json({ message: 'Senha redefinida com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao redefinir senha:', error as Error);
      res.status(500).json({ error: 'Erro ao redefinir senha' });
    }
  }

  async me(req: AuthRequest, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyId: true,
          clientId: true,
          hideSidebar: true,
          company: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          linkedClient: {
            select: {
              id: true,
              name: true,
            },
          },
          permissions: {
            select: {
              resource: true,
              canView: true,
              canEdit: true,
              canDelete: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Adicionar informações extras para usuários CLIENT
      const response: any = { ...user };
      if (user.role === 'CLIENT' && user.linkedClient) {
        response.clientName = user.linkedClient.name;
        response.isPortalUser = true;
      }

      res.json(response);
    } catch (error) {
      appLogger.error('Erro ao buscar usuário:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
    }
  }

  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Token não fornecido' });
      }

      const user = await prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationExpiry: {
            gt: new Date(),
          },
        },
      });

      if (!user) {
        return res.status(400).json({
          error: 'Token inválido ou expirado',
          message: 'O link de verificação é inválido ou expirou. Por favor, solicite um novo link.'
        });
      }

      // Verifica o email do usuário
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiry: null,
        },
      });

      securityLogger.emailVerified(user.email, user.id);

      // Envia email de boas-vindas após verificação
      try {
        await sendWelcomeEmail(user.email, user.name);
      } catch (error) {
        appLogger.error('Erro ao enviar email de boas-vindas:', error as Error);
      }

      res.json({
        message: 'Email verificado com sucesso! Você já pode fazer login no sistema.',
        success: true
      });
    } catch (error) {
      appLogger.error('Erro ao verificar email:', error as Error);
      res.status(500).json({ error: 'Erro ao verificar email' });
    }
  }

  async resendVerificationEmail(req: Request, res: Response) {
    try {
      const { email } = req.body;

      const user = await prisma.user.findFirst({
        where: { email },
      });

      if (!user) {
        // Por segurança, não revela se o email existe
        return res.json({ message: 'Se o email existir e não estiver verificado, um novo link foi enviado' });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: 'Este email já foi verificado' });
      }

      // Gera novo token de verificação
      const emailVerificationToken = generateSimpleToken();
      const emailVerificationExpiry = new Date(Date.now() + 86400000); // 24 horas

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken,
          emailVerificationExpiry,
        },
      });

      await sendEmailVerification(email, user.name, emailVerificationToken);

      res.json({ message: 'Se o email existir e não estiver verificado, um novo link foi enviado' });
    } catch (error) {
      appLogger.error('Erro ao reenviar email:', error as Error);
      res.status(500).json({ error: 'Erro ao processar solicitação' });
    }
  }
  /**
   * Embed Authentication - Auto-login via embed token
   * Used for Chatwell integration iframe embedding
   *
   * GET /api/auth/embed/:token
   *
   * SEGURANCA: Este endpoint requer validacao adicional pois permite login automatico
   */
  async embedAuth(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const clientIp = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const origin = req.headers['origin'] || req.headers['referer'] || 'unknown';

      if (!token) {
        securityLogger.loginFailed('embed', 'Token nao fornecido', clientIp);
        return res.status(400).json({ error: 'Token não fornecido' });
      }

      // SEGURANCA: Validar comprimento minimo do token (API keys devem ter 32+ chars)
      if (token.length < 32) {
        securityLogger.loginFailed('embed', 'Token muito curto - possivel ataque', clientIp);
        return res.status(401).json({ error: 'Token inválido' });
      }

      // 1. Buscar empresa pelo apiKey (embed token)
      const company = await prisma.company.findFirst({
        where: {
          apiKey: token,
          active: true,
        },
      });

      if (!company) {
        securityLogger.loginFailed('embed', 'Token invalido ou empresa inativa', clientIp);
        return res.status(401).json({ error: 'Token inválido ou empresa inativa' });
      }

      // 2. Verificar assinatura
      if (company.subscriptionStatus === 'EXPIRED' || company.subscriptionStatus === 'CANCELLED') {
        securityLogger.loginFailed('embed', `Assinatura ${company.subscriptionStatus} - empresa ${company.id}`, clientIp);
        return res.status(403).json({ error: 'Assinatura expirada ou cancelada' });
      }

      // Se for TRIAL, verificar se ainda está válido
      if (company.subscriptionStatus === 'TRIAL' && company.trialEndsAt) {
        if (new Date() > new Date(company.trialEndsAt)) {
          securityLogger.loginFailed('embed', `Trial expirado - empresa ${company.id}`, clientIp);
          return res.status(403).json({ error: 'Período de teste expirado' });
        }
      }

      // 3. SEGURANCA: Buscar primeiro usuario ATIVO (nao necessariamente ADMIN)
      // Isso evita escalacao de privilegios via embed
      const user = await prisma.user.findFirst({
        where: {
          companyId: company.id,
          active: true,
          emailVerified: true, // SEGURANCA: Exigir email verificado
        },
        orderBy: { createdAt: 'asc' }, // Pegar o usuario mais antigo
      });

      if (!user) {
        appLogger.error('Nenhum usuario verificado para embed', undefined, { companyId: company.id });
        return res.status(500).json({ error: 'Nenhum usuário ativo encontrado para esta empresa' });
      }

      // 4. Gerar JWT token
      const tokens = generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId || undefined,
      });

      // SEGURANCA: Log detalhado para auditoria
      securityLogger.loginSuccess(user.email, user.id, clientIp);
      appLogger.info('Embed auth realizado', { email: user.email, role: user.role, origin });

      // 5. Retornar dados com hideSidebar = true para embed
      res.json({
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          companyName: company.name,
          hideSidebar: true, // Sempre true para embed
        },
        company: {
          id: company.id,
          name: company.name,
        },
      });
    } catch (error) {
      appLogger.error('Erro na autenticação embed:', error as Error);
      res.status(500).json({ error: 'Erro ao autenticar via embed' });
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token é obrigatório' });
      }

      // Verifica o refresh token
      let decoded;
      try {
        decoded = verifyRefreshToken(refreshToken);
      } catch (error) {
        return res.status(401).json({ error: 'Refresh token inválido ou expirado' });
      }

      // Busca o usuário
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          company: true,
          linkedClient: true,  // Incluir cliente vinculado para usuários do portal
        },
      });

      if (!user || !user.active) {
        return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
      }

      if (user.company && !user.company.active) {
        return res.status(401).json({ error: 'Empresa inativa' });
      }

      // Gera novos tokens (incluir clientId para usuários CLIENT)
      const tokens = generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId || undefined,
        clientId: user.role === 'CLIENT' ? user.clientId || undefined : undefined,
      });

      // Resposta com dados adicionais para usuários CLIENT
      const responseUser: any = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company?.name,
      };

      if (user.role === 'CLIENT' && user.linkedClient) {
        responseUser.clientId = user.clientId;
        responseUser.clientName = user.linkedClient.name;
        responseUser.isPortalUser = true;
      }

      res.json({
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: responseUser,
      });
    } catch (error) {
      appLogger.error('Erro ao renovar token:', error as Error);
      res.status(500).json({ error: 'Erro ao renovar token' });
    }
  }

  /**
   * TAREFA 2.1: Logout seguro com blacklist de token
   * POST /api/auth/logout
   *
   * Adiciona o token atual a blacklist no Redis
   * Tokens na blacklist sao rejeitados pelo middleware de autenticacao
   */
  async logout(req: AuthRequest, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(400).json({ error: 'Token não fornecido' });
      }

      // Adiciona token a blacklist
      await blacklistToken(token);

      // Log de seguranca
      securityLogger.info('Logout realizado', { email: req.user?.email, userId: req.user?.userId });

      res.json({ message: 'Logout realizado com sucesso' });
    } catch (error) {
      appLogger.error('Erro no logout:', error as Error);
      res.status(500).json({ error: 'Erro ao realizar logout' });
    }
  }

  /**
   * Logout de todas as sessoes do usuario
   * POST /api/auth/logout-all
   *
   * Invalida todos os tokens do usuario (util para "logout de todos os dispositivos")
   */
  async logoutAll(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Invalida todos os tokens do usuario
      await invalidateAllUserTokens(req.user.userId);

      // Log de seguranca
      securityLogger.info('Logout de todas as sessoes', { email: req.user.email, userId: req.user.userId });

      res.json({ message: 'Logout de todas as sessões realizado com sucesso' });
    } catch (error) {
      appLogger.error('Erro no logout-all:', error as Error);
      res.status(500).json({ error: 'Erro ao realizar logout de todas as sessões' });
    }
  }
}

export default new AuthController();
