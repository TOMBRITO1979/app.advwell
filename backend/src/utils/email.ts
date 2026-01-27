import nodemailer from 'nodemailer';
import DOMPurify from 'isomorphic-dompurify';
import { config } from '../config';

/**
 * TAREFA 2.3: Sanitiza conteudo do usuario para templates de email
 * Remove qualquer HTML/JS potencialmente malicioso
 * Escapa caracteres especiais HTML
 */
const sanitizeForEmail = (input: string | undefined): string => {
  if (!input) return '';
  // Remove qualquer HTML/script tags
  const sanitized = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  // Escapa caracteres HTML restantes para prevenir XSS
  return sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: false,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.password,
  },
});

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string
) => {
  const resetUrl = `${config.urls.frontend}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: config.smtp.from,
    to: email,
    subject: 'Redefinição de Senha - AdvWell',
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redefinição de Senha - AdvWell</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
          <tr>
            <td style="padding: 40px 20px;">
              <!-- Container principal -->
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

                <!-- Header com gradiente -->
                <tr>
                  <td style="background-color: #43A047; background: linear-gradient(135deg, #43A047 0%, #2E7D32 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                      AdvWell
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; font-weight: 500;">
                      Sistema de Gestão para Escritórios de Advocacia
                    </p>
                  </td>
                </tr>

                <!-- Conteúdo -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <!-- Ícone de cadeado -->
                    <div style="text-align: center; margin-bottom: 24px;">
                      <div style="display: inline-block; width: 64px; height: 64px; background-color: #C8E6C9; border-radius: 50%; line-height: 64px; font-size: 32px;">
                        🔐
                      </div>
                    </div>

                    <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 600; text-align: center;">
                      Redefinição de Senha
                    </h2>

                    <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;">
                      Recebemos uma solicitação para redefinir a senha da sua conta AdvWell.
                    </p>

                    <p style="margin: 0 0 32px 0; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
                      Clique no botão abaixo para criar uma nova senha:
                    </p>

                    <!-- Botão principal -->
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${resetUrl}" style="display: inline-block; padding: 16px 48px; background-color: #43A047; background: linear-gradient(135deg, #43A047 0%, #2E7D32 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(67, 160, 71, 0.3);">
                        Redefinir Minha Senha
                      </a>
                    </div>

                    <!-- Divider -->
                    <div style="margin: 32px 0; border-top: 1px solid #e5e7eb;"></div>

                    <!-- Link alternativo -->
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; text-align: center;">
                      Ou copie e cole este link no seu navegador:
                    </p>
                    <p style="margin: 0 0 32px 0; padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; color: #43A047; font-size: 12px; word-break: break-all; text-align: center;">
                      ${resetUrl}
                    </p>

                    <!-- Aviso de segurança -->
                    <div style="padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
                      <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                        <strong>⚠️ Importante:</strong> Este link expira em 1 hora por questões de segurança.
                      </p>
                    </div>

                    <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.6; text-align: center;">
                      Se você não solicitou esta redefinição de senha, ignore este email. Sua senha permanecerá inalterada.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; text-align: center;">
                      Este é um email automático, por favor não responda.
                    </p>
                    <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 13px; text-align: center;">
                      <strong>AdvWell</strong> - Sistema de Gestão para Escritórios de Advocacia
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      © 2025 AdvWell. Todos os direitos reservados.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const sendWelcomeEmail = async (email: string, name: string) => {
  // TAREFA 2.3: Sanitizar nome do usuario
  const safeName = sanitizeForEmail(name);

  const mailOptions = {
    from: config.smtp.from,
    to: email,
    subject: 'Bem-vindo ao AdvWell',
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bem-vindo ao AdvWell</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
          <tr>
            <td style="padding: 40px 20px;">
              <!-- Container principal -->
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

                <!-- Header com gradiente -->
                <tr>
                  <td style="background-color: #43A047; background: linear-gradient(135deg, #43A047 0%, #2E7D32 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                      AdvWell
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; font-weight: 500;">
                      Sistema de Gestão para Escritórios de Advocacia
                    </p>
                  </td>
                </tr>

                <!-- Conteúdo -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <!-- Ícone de boas-vindas -->
                    <div style="text-align: center; margin-bottom: 24px;">
                      <div style="display: inline-block; width: 64px; height: 64px; background-color: #d1fae5; border-radius: 50%; line-height: 64px; font-size: 32px;">
                        👋
                      </div>
                    </div>

                    <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 600; text-align: center;">
                      Bem-vindo ao AdvWell!
                    </h2>

                    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;">
                      Olá <strong>${safeName}</strong>,
                    </p>

                    <p style="margin: 0 0 32px 0; color: #6b7280; font-size: 15px; line-height: 1.6; text-align: center;">
                      Sua conta foi criada com sucesso! Agora você tem acesso ao sistema completo de gestão para escritórios de advocacia.
                    </p>

                    <!-- Recursos principais -->
                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
                      <p style="margin: 0 0 16px 0; color: #374151; font-size: 14px; font-weight: 600; text-align: center;">
                        O que você pode fazer no AdvWell:
                      </p>
                      <table role="presentation" style="width: 100%;">
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                            ✓ Gerenciar clientes e processos
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                            ✓ Controle financeiro completo
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                            ✓ Integração com DataJud CNJ
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                            ✓ Gestão de documentos
                          </td>
                        </tr>
                      </table>
                    </div>

                    <!-- Botão principal -->
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${config.urls.frontend}" style="display: inline-block; padding: 16px 48px; background-color: #43A047; background: linear-gradient(135deg, #43A047 0%, #2E7D32 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(67, 160, 71, 0.3);">
                        Acessar o Sistema
                      </a>
                    </div>

                    <!-- Link alternativo -->
                    <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 13px; text-align: center;">
                      Ou acesse diretamente em:<br>
                      <a href="${config.urls.frontend}" style="color: #43A047; text-decoration: none; font-weight: 500;">${config.urls.frontend}</a>
                    </p>

                    <div style="margin: 32px 0; border-top: 1px solid #e5e7eb;"></div>

                    <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
                      Atenciosamente,<br>
                      <strong style="color: #43A047;">Equipe AdvWell</strong>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; text-align: center;">
                      Este é um email automático, por favor não responda.
                    </p>
                    <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 13px; text-align: center;">
                      <strong>AdvWell</strong> - Sistema de Gestão para Escritórios de Advocacia
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      © 2025 AdvWell. Todos os direitos reservados.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const sendEmailVerification = async (
  email: string,
  name: string,
  verificationToken: string
) => {
  // TAREFA 2.3: Sanitizar nome do usuario
  const safeName = sanitizeForEmail(name);
  const verificationUrl = `${config.urls.frontend}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: config.smtp.from,
    to: email,
    subject: 'Verifique seu Email - AdvWell',
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verificação de Email - AdvWell</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
          <tr>
            <td style="padding: 40px 20px;">
              <!-- Container principal -->
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

                <!-- Header com gradiente -->
                <tr>
                  <td style="background-color: #43A047; background: linear-gradient(135deg, #43A047 0%, #2E7D32 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                      AdvWell
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; font-weight: 500;">
                      Sistema de Gestão para Escritórios de Advocacia
                    </p>
                  </td>
                </tr>

                <!-- Conteúdo -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <!-- Ícone de verificação -->
                    <div style="text-align: center; margin-bottom: 24px;">
                      <div style="display: inline-block; width: 64px; height: 64px; background-color: #C8E6C9; border-radius: 50%; line-height: 64px; font-size: 32px;">
                        ✉️
                      </div>
                    </div>

                    <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 600; text-align: center;">
                      Confirme seu Email
                    </h2>

                    <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;">
                      Olá <strong>${safeName}</strong>,
                    </p>

                    <p style="margin: 0 0 32px 0; color: #6b7280; font-size: 15px; line-height: 1.6; text-align: center;">
                      Obrigado por se cadastrar no AdvWell! Para completar seu cadastro e começar a usar o sistema, precisamos verificar seu email.
                    </p>

                    <!-- Botão principal -->
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${verificationUrl}" style="display: inline-block; padding: 16px 48px; background-color: #10b981; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                        Verificar Meu Email
                      </a>
                    </div>

                    <!-- Divider -->
                    <div style="margin: 32px 0; border-top: 1px solid #e5e7eb;"></div>

                    <!-- Link alternativo -->
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; text-align: center;">
                      Ou copie e cole este link no seu navegador:
                    </p>
                    <p style="margin: 0 0 32px 0; padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; color: #43A047; font-size: 12px; word-break: break-all; text-align: center;">
                      ${verificationUrl}
                    </p>

                    <!-- Aviso de segurança -->
                    <div style="padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
                      <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                        <strong>⚠️ Importante:</strong> Este link expira em 24 horas. Após verificar seu email, você poderá acessar o sistema normalmente.
                      </p>
                    </div>

                    <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.6; text-align: center;">
                      Se você não se cadastrou no AdvWell, ignore este email.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; text-align: center;">
                      Este é um email automático, por favor não responda.
                    </p>
                    <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 13px; text-align: center;">
                      <strong>AdvWell</strong> - Sistema de Gestão para Escritórios de Advocacia
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      © 2025 AdvWell. Todos os direitos reservados.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const sendCaseUpdateNotification = async (
  clientEmail: string,
  clientName: string,
  processNumber: string,
  updateMessage: string,
  companyName?: string
) => {
  // TAREFA 2.3: Sanitizar todos os dados de usuario
  const safeClientName = sanitizeForEmail(clientName);
  const safeProcessNumber = sanitizeForEmail(processNumber);
  const safeUpdateMessage = sanitizeForEmail(updateMessage);
  const safeCompanyName = sanitizeForEmail(companyName);

  const mailOptions = {
    from: config.smtp.from,
    to: clientEmail,
    subject: `Atualização do Processo ${safeProcessNumber} - ${safeCompanyName || 'AdvWell'}`,
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Atualização do Processo - ${safeCompanyName || 'AdvWell'}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
          <tr>
            <td style="padding: 40px 20px;">
              <!-- Container principal -->
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

                <!-- Header com gradiente -->
                <tr>
                  <td style="background-color: #43A047; background: linear-gradient(135deg, #43A047 0%, #2E7D32 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                      ${safeCompanyName || 'AdvWell'}
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; font-weight: 500;">
                      Atualização do Processo
                    </p>
                  </td>
                </tr>

                <!-- Conteúdo -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <!-- Ícone de notificação -->
                    <div style="text-align: center; margin-bottom: 24px;">
                      <div style="display: inline-block; width: 64px; height: 64px; background-color: #C8E6C9; border-radius: 50%; line-height: 64px; font-size: 32px;">
                        ⚖️
                      </div>
                    </div>

                    <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 600; text-align: center;">
                      Novo Andamento do Processo
                    </h2>

                    <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;">
                      Olá <strong>${safeClientName}</strong>,
                    </p>

                    <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.6; text-align: center;">
                      Há uma atualização importante referente ao processo:
                    </p>

                    <!-- Processo Number -->
                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
                      <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">
                        Número do Processo
                      </p>
                      <p style="margin: 8px 0 0 0; color: #111827; font-size: 18px; font-weight: 700; font-family: 'Courier New', monospace;">
                        ${safeProcessNumber}
                      </p>
                    </div>

                    <!-- Informação para o Cliente -->
                    <div style="background-color: #E8F5E9; border-left: 4px solid #43A047; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
                      <p style="margin: 0 0 12px 0; color: #2E7D32; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                        📋 Informação para o Cliente
                      </p>
                      <p style="margin: 0; color: #1B5E20; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
${safeUpdateMessage}
                      </p>
                    </div>

                    <!-- Divider -->
                    <div style="margin: 32px 0; border-top: 1px solid #e5e7eb;"></div>

                    <!-- Botão principal -->
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${config.urls.frontend}" style="display: inline-block; padding: 16px 48px; background-color: #43A047; background: linear-gradient(135deg, #43A047 0%, #2E7D32 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(67, 160, 71, 0.3);">
                        Acessar o Sistema
                      </a>
                    </div>

                    <!-- Aviso informativo -->
                    <div style="padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; margin-top: 24px;">
                      <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                        <strong>ℹ️ Informação:</strong> Esta é uma notificação automática sobre o andamento do seu processo. Para mais detalhes, acesse o sistema ou entre em contato com o escritório.
                      </p>
                    </div>

                    <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
                      Atenciosamente,<br>
                      <strong style="color: #43A047;">${safeCompanyName || 'AdvWell'}</strong>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; text-align: center;">
                      Este é um email automático, por favor não responda.
                    </p>
                    <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 13px; text-align: center;">
                      <strong>${safeCompanyName || 'AdvWell'}</strong> - Sistema de Gestão para Escritórios de Advocacia
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      © 2025 ${safeCompanyName || 'AdvWell'}. Todos os direitos reservados.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Envia email de boas-vindas para usuários do portal do cliente
 * Inclui senha temporária e link de verificação
 */
export const sendPortalWelcomeEmail = async (
  email: string,
  name: string,
  password: string,
  companyName: string
) => {
  const safeName = sanitizeForEmail(name);
  const safeCompanyName = sanitizeForEmail(companyName);
  const portalUrl = config.urls.portal;

  const mailOptions = {
    from: config.smtp.from,
    to: email,
    subject: `Bem-vindo ao Portal do Cliente - ${safeCompanyName}`,
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Portal do Cliente - ${safeCompanyName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
          <tr>
            <td style="padding: 40px 20px;">
              <!-- Container principal -->
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

                <!-- Header com gradiente -->
                <tr>
                  <td style="background-color: #43A047; background: linear-gradient(135deg, #43A047 0%, #2E7D32 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                      ${safeCompanyName}
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; font-weight: 500;">
                      Portal do Cliente
                    </p>
                  </td>
                </tr>

                <!-- Conteúdo -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <!-- Ícone -->
                    <div style="text-align: center; margin-bottom: 24px;">
                      <div style="display: inline-block; width: 64px; height: 64px; background-color: #C8E6C9; border-radius: 50%; line-height: 64px; font-size: 32px;">
                        👤
                      </div>
                    </div>

                    <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 600; text-align: center;">
                      Bem-vindo ao Portal do Cliente!
                    </h2>

                    <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;">
                      Olá <strong>${safeName}</strong>,
                    </p>

                    <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.6; text-align: center;">
                      O escritório <strong>${safeCompanyName}</strong> criou seu acesso ao Portal do Cliente. Através dele você poderá acompanhar seus processos e receber atualizações importantes.
                    </p>

                    <!-- Credenciais -->
                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                      <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px; font-weight: 600; text-align: center;">
                        Suas credenciais de acesso:
                      </p>
                      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; text-align: center;">
                        <strong>Email:</strong> ${email}
                      </p>
                      <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
                        <strong>Senha:</strong> <code style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${password}</code>
                      </p>
                    </div>

                    <!-- Botão de acesso ao portal -->
                    <div style="text-align: center; margin: 24px 0;">
                      <a href="${portalUrl}" style="display: inline-block; padding: 16px 48px; background-color: #43A047; background: linear-gradient(135deg, #43A047 0%, #2E7D32 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(67, 160, 71, 0.3);">
                        Acessar o Portal
                      </a>
                    </div>

                    <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px; text-align: center;">
                      Ou acesse diretamente: <a href="${portalUrl}" style="color: #43A047;">${portalUrl}</a>
                    </p>

                    <!-- Divider -->
                    <div style="margin: 32px 0; border-top: 1px solid #e5e7eb;"></div>

                    <!-- No Portal você pode -->
                    <h3 style="margin: 0 0 16px 0; color: #374151; font-size: 16px; font-weight: 600;">
                      No Portal você pode:
                    </h3>
                    <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.8;">
                      <li>Acompanhar seus processos em tempo real</li>
                      <li>Ver o histórico de movimentações</li>
                      <li>Receber avisos importantes do escritório</li>
                      <li>Consultar os dados do escritório</li>
                    </ul>

                    <!-- Aviso de segurança -->
                    <div style="padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
                      <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                        <strong>🔐 Segurança:</strong> Recomendamos que você altere sua senha após o primeiro acesso. Não compartilhe suas credenciais com terceiros.
                      </p>
                    </div>

                    <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
                      Atenciosamente,<br>
                      <strong style="color: #43A047;">${safeCompanyName}</strong>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; text-align: center;">
                      Este é um email automático, por favor não responda.
                    </p>
                    <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 13px; text-align: center;">
                      <strong>${safeCompanyName}</strong> - Portal do Cliente
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      © 2025 AdvWell. Todos os direitos reservados.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Envia email de notificação quando um usuário é atribuído a um evento
 */
export const sendEventAssignmentNotification = async (
  userEmail: string,
  userName: string,
  eventTitle: string,
  eventDate: Date,
  eventType: string,
  eventDescription: string | null,
  assignedByName: string,
  companyName?: string
) => {
  const safeName = sanitizeForEmail(userName);
  const safeEventTitle = sanitizeForEmail(eventTitle);
  const safeDescription = sanitizeForEmail(eventDescription || '');
  const safeAssignedByName = sanitizeForEmail(assignedByName);
  const safeCompanyName = sanitizeForEmail(companyName);

  // Formatar data em português
  const formattedDate = eventDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });

  // Mapear tipos de evento para labels em português
  const typeLabels: Record<string, string> = {
    'COMPROMISSO': 'Compromisso',
    'TAREFA': 'Tarefa',
    'PRAZO': 'Prazo',
    'AUDIENCIA': 'Audiência',
    'PERICIA': 'Perícia',
    'GOOGLE_MEET': 'Google Meet',
  };
  const eventTypeLabel = typeLabels[eventType] || eventType;

  // Cores por tipo de evento
  const typeColors: Record<string, string> = {
    'COMPROMISSO': '#3B82F6',
    'TAREFA': '#10B981',
    'PRAZO': '#EF4444',
    'AUDIENCIA': '#8B5CF6',
    'PERICIA': '#F59E0B',
    'GOOGLE_MEET': '#F97316',
  };
  const typeColor = typeColors[eventType] || '#43A047';

  const mailOptions = {
    from: config.smtp.from,
    to: userEmail,
    subject: `Você foi atribuído a: ${safeEventTitle} - ${safeCompanyName || 'AdvWell'}`,
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nova Atribuição de Evento - ${safeCompanyName || 'AdvWell'}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                <tr>
                  <td style="background-color: #43A047; background: linear-gradient(135deg, #43A047 0%, #2E7D32 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">${safeCompanyName || 'AdvWell'}</h1>
                    <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px;">Nova Atribuição de Evento</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                      <div style="display: inline-block; width: 64px; height: 64px; background-color: #C8E6C9; border-radius: 50%; line-height: 64px; font-size: 32px;">📅</div>
                    </div>
                    <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 600; text-align: center;">Você foi atribuído a um evento!</h2>
                    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; text-align: center;">Olá <strong>${safeName}</strong>,</p>
                    <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; text-align: center;"><strong>${safeAssignedByName}</strong> adicionou você como responsável no seguinte evento:</p>
                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px; border-left: 4px solid ${typeColor};">
                      <div style="margin-bottom: 16px;">
                        <span style="display: inline-block; padding: 4px 12px; background-color: ${typeColor}; color: #ffffff; font-size: 12px; font-weight: 600; border-radius: 4px;">${eventTypeLabel}</span>
                      </div>
                      <p style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 700;">${safeEventTitle}</p>
                      <div style="margin-bottom: 12px;">
                        <span style="color: #6b7280; font-size: 14px;">🗓️ <strong>Data:</strong> ${formattedDate}</span>
                      </div>
                      ${safeDescription ? `<div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;"><p style="margin: 0 0 8px 0; color: #374151; font-size: 13px; font-weight: 600;">Descrição:</p><p style="margin: 0; color: #6b7280; font-size: 14px;">${safeDescription}</p></div>` : ''}
                    </div>
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${config.urls.frontend}/agenda" style="display: inline-block; padding: 16px 48px; background-color: #43A047; background: linear-gradient(135deg, #43A047 0%, #2E7D32 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">Ver na Agenda</a>
                    </div>
                    <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 14px; text-align: center;">Atenciosamente,<br><strong style="color: #43A047;">${safeCompanyName || 'AdvWell'}</strong></p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; text-align: center;">Este é um email automático, por favor não responda.</p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">© 2025 ${safeCompanyName || 'AdvWell'}. Todos os direitos reservados.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Envia email de lembrete de prazo/tarefa
 */
export const sendDeadlineReminderEmail = async (
  userEmail: string,
  userName: string,
  eventTitle: string,
  eventDate: Date,
  eventType: string,
  eventDescription: string | null,
  companyName: string,
  isOverdue: boolean = false
) => {
  const safeName = sanitizeForEmail(userName);
  const safeEventTitle = sanitizeForEmail(eventTitle);
  const safeDescription = sanitizeForEmail(eventDescription || '');
  const safeCompanyName = sanitizeForEmail(companyName);

  // Formatar data em português
  const formattedDate = eventDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });

  // Mapear tipos de evento para labels em português
  const typeLabels: Record<string, string> = {
    'PRAZO': 'Prazo',
    'TAREFA': 'Tarefa',
  };
  const eventTypeLabel = typeLabels[eventType] || eventType;

  // Cores por tipo de evento
  const typeColors: Record<string, string> = {
    'PRAZO': '#EF4444',
    'TAREFA': '#10B981',
  };
  const typeColor = typeColors[eventType] || '#EF4444';

  // Definir cores e textos baseado se está vencido ou não
  const headerColor = isOverdue ? '#DC2626' : '#F59E0B';
  const headerGradient = isOverdue
    ? 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)'
    : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)';
  const statusIcon = isOverdue ? '🚨' : '⏰';
  const headerTitle = isOverdue ? 'Prazo Vencido!' : 'Lembrete de Prazo';

  const mailOptions = {
    from: config.smtp.from,
    to: userEmail,
    subject: `${statusIcon} ${isOverdue ? 'VENCIDO' : 'LEMBRETE'}: ${safeEventTitle} - ${safeCompanyName}`,
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${headerTitle} - ${safeCompanyName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                <tr>
                  <td style="background-color: ${headerColor}; background: ${headerGradient}; padding: 40px 30px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 16px;">${statusIcon}</div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">${headerTitle}</h1>
                    <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; opacity: 0.9;">${safeCompanyName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px;">Olá <strong>${safeName}</strong>,</p>
                    <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px;">
                      ${isOverdue
                        ? 'O seguinte prazo/tarefa atribuído a você está <strong style="color: #DC2626;">VENCIDO</strong>:'
                        : 'Este é um lembrete sobre um prazo/tarefa atribuído a você que <strong style="color: #F59E0B;">vence em breve</strong>:'
                      }
                    </p>
                    <div style="background-color: ${isOverdue ? '#FEF2F2' : '#FFFBEB'}; border-radius: 8px; padding: 24px; margin-bottom: 24px; border-left: 4px solid ${typeColor};">
                      <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                        <span style="display: inline-block; padding: 4px 12px; background-color: ${typeColor}; color: #ffffff; font-size: 12px; font-weight: 600; border-radius: 4px;">${eventTypeLabel}</span>
                        ${isOverdue ? '<span style="display: inline-block; padding: 4px 12px; background-color: #DC2626; color: #ffffff; font-size: 12px; font-weight: 600; border-radius: 4px;">VENCIDO</span>' : ''}
                      </div>
                      <p style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 700;">${safeEventTitle}</p>
                      <div style="margin-bottom: 12px;">
                        <span style="color: ${isOverdue ? '#DC2626' : '#6b7280'}; font-size: 14px; font-weight: ${isOverdue ? '600' : '400'};">
                          🗓️ <strong>${isOverdue ? 'Venceu em:' : 'Vence em:'}</strong> ${formattedDate}
                        </span>
                      </div>
                      ${safeDescription ? `<div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid ${isOverdue ? '#FECACA' : '#FDE68A'};"><p style="margin: 0 0 8px 0; color: #374151; font-size: 13px; font-weight: 600;">Descrição:</p><p style="margin: 0; color: #6b7280; font-size: 14px;">${safeDescription}</p></div>` : ''}
                    </div>
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${config.urls.frontend}/deadlines" style="display: inline-block; padding: 16px 48px; background-color: ${headerColor}; background: ${headerGradient}; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">Ver Prazos</a>
                    </div>
                    <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 14px; text-align: center;">Atenciosamente,<br><strong style="color: #43A047;">${safeCompanyName}</strong></p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; text-align: center;">Este é um email automático de lembrete.</p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">© 2025 ${safeCompanyName}. Todos os direitos reservados.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};
