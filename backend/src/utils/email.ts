import nodemailer from 'nodemailer';
import { config } from '../config';

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
                  <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                      AdvWell
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px; font-weight: 500;">
                      Sistema de Gestão para Escritórios de Advocacia
                    </p>
                  </td>
                </tr>

                <!-- Conteúdo -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <!-- Ícone de cadeado -->
                    <div style="text-align: center; margin-bottom: 24px;">
                      <div style="display: inline-block; width: 64px; height: 64px; background-color: #dbeafe; border-radius: 50%; line-height: 64px; font-size: 32px;">
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
                      <a href="${resetUrl}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); transition: transform 0.2s;">
                        Redefinir Minha Senha
                      </a>
                    </div>

                    <!-- Divider -->
                    <div style="margin: 32px 0; border-top: 1px solid #e5e7eb;"></div>

                    <!-- Link alternativo -->
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; text-align: center;">
                      Ou copie e cole este link no seu navegador:
                    </p>
                    <p style="margin: 0 0 32px 0; padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; color: #2563eb; font-size: 12px; word-break: break-all; text-align: center;">
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
                  <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                      AdvWell
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px; font-weight: 500;">
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
                      Olá <strong>${name}</strong>,
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
                      <a href="${config.urls.frontend}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                        Acessar o Sistema
                      </a>
                    </div>

                    <!-- Link alternativo -->
                    <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 13px; text-align: center;">
                      Ou acesse diretamente em:<br>
                      <a href="${config.urls.frontend}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${config.urls.frontend}</a>
                    </p>

                    <div style="margin: 32px 0; border-top: 1px solid #e5e7eb;"></div>

                    <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
                      Atenciosamente,<br>
                      <strong style="color: #2563eb;">Equipe AdvWell</strong>
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
                  <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                      AdvWell
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px; font-weight: 500;">
                      Sistema de Gestão para Escritórios de Advocacia
                    </p>
                  </td>
                </tr>

                <!-- Conteúdo -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <!-- Ícone de verificação -->
                    <div style="text-align: center; margin-bottom: 24px;">
                      <div style="display: inline-block; width: 64px; height: 64px; background-color: #dbeafe; border-radius: 50%; line-height: 64px; font-size: 32px;">
                        ✉️
                      </div>
                    </div>

                    <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 600; text-align: center;">
                      Confirme seu Email
                    </h2>

                    <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;">
                      Olá <strong>${name}</strong>,
                    </p>

                    <p style="margin: 0 0 32px 0; color: #6b7280; font-size: 15px; line-height: 1.6; text-align: center;">
                      Obrigado por se cadastrar no AdvWell! Para completar seu cadastro e começar a usar o sistema, precisamos verificar seu email.
                    </p>

                    <!-- Botão principal -->
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${verificationUrl}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                        Verificar Meu Email
                      </a>
                    </div>

                    <!-- Divider -->
                    <div style="margin: 32px 0; border-top: 1px solid #e5e7eb;"></div>

                    <!-- Link alternativo -->
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; text-align: center;">
                      Ou copie e cole este link no seu navegador:
                    </p>
                    <p style="margin: 0 0 32px 0; padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; color: #2563eb; font-size: 12px; word-break: break-all; text-align: center;">
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
