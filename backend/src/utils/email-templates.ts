/**
 * Templates de Email para Campanhas
 *
 * Variáveis disponíveis:
 * - {nome_cliente} - Nome do cliente/destinatário
 * - {nome_empresa} - Nome da empresa/escritório
 * - {data} - Data atual formatada
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * SEGURANCA: Sanitiza conteudo do usuario para prevenir XSS em templates de email
 * Remove tags HTML/JS e escapa caracteres especiais
 */
const sanitizeForTemplate = (input: string | undefined): string => {
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

export const emailTemplates = {
  // Template 1: Perícia Marcada
  pericia_marcada: {
    name: 'Perícia Marcada',
    subject: 'Perícia Marcada - Ação Necessária',
    body: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 40px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
        .icon { width: 80px; height: 80px; background-color: #ffffff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 40px; margin-bottom: 20px; }
        .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
        .greeting { font-size: 18px; font-weight: 600; color: #16a34a; margin-bottom: 20px; }
        .message { font-size: 16px; margin-bottom: 20px; }
        .info-box { background-color: #dcfce7; border-left: 4px solid #16a34a; padding: 20px; margin: 25px 0; border-radius: 4px; }
        .info-box strong { color: #15803d; }
        .action-box { background-color: #fef3c7; border: 2px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 8px; text-align: center; }
        .action-box .title { color: #d97706; font-weight: bold; font-size: 18px; margin-bottom: 10px; }
        .button { display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #ffffff !important; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; box-shadow: 0 4px 6px rgba(22, 163, 74, 0.3); }
        .footer { background-color: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
        .signature { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; font-style: italic; color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">🏥</div>
            <h1>Perícia Médica Marcada</h1>
        </div>
        <div class="content">
            <div class="greeting">Olá, {nome_cliente}!</div>

            <div class="message">
                Informamos que a <strong>perícia médica</strong> do seu processo foi agendada.
            </div>

            <div class="info-box">
                <strong>⚠️ IMPORTANTE:</strong> É fundamental que você compareça à perícia na data e horário marcados.
                O não comparecimento pode prejudicar o andamento do seu processo.
            </div>

            <div class="action-box">
                <div class="title">🔔 AÇÃO NECESSÁRIA</div>
                <p>Por favor, entre em contato com nosso escritório <strong>com urgência</strong> para confirmar o recebimento desta notificação e obter os detalhes completos sobre:</p>
                <ul style="text-align: left; display: inline-block; margin: 10px 0;">
                    <li>Data e horário da perícia</li>
                    <li>Local do atendimento</li>
                    <li>Documentos necessários</li>
                    <li>Orientações importantes</li>
                </ul>
            </div>

            <div style="text-align: center;">
                <a href="tel:+5511999999999" class="button">📞 Ligar Agora</a>
            </div>

            <div class="signature">
                Atenciosamente,<br>
                <strong>{nome_empresa}</strong>
            </div>
        </div>
        <div class="footer">
            <p>Este é um email automático. Por favor, não responda.</p>
            <p>Para mais informações, entre em contato conosco.</p>
            <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
                © {data} {nome_empresa}. Todos os direitos reservados.
            </p>
        </div>
    </div>
</body>
</html>
    `,
  },

  // Template 2: Processo Pendente
  processo_pendente: {
    name: 'Processo Pendente - Contato Urgente',
    subject: 'Processo Pendente - Necessário Contato Urgente',
    body: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
        .icon { width: 80px; height: 80px; background-color: #ffffff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 40px; margin-bottom: 20px; }
        .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
        .greeting { font-size: 18px; font-weight: 600; color: #f59e0b; margin-bottom: 20px; }
        .message { font-size: 16px; margin-bottom: 20px; }
        .alert-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 4px; }
        .alert-box strong { color: #d97706; }
        .urgent-box { background-color: #fee2e2; border: 2px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 8px; text-align: center; }
        .urgent-box .title { color: #dc2626; font-weight: bold; font-size: 20px; margin-bottom: 10px; }
        .button { display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff !important; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3); }
        .contact-methods { display: flex; justify-content: space-around; margin: 30px 0; flex-wrap: wrap; }
        .contact-item { text-align: center; padding: 15px; flex: 1; min-width: 150px; }
        .contact-item .icon-circle { width: 60px; height: 60px; background-color: #fef3c7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px; margin-bottom: 10px; }
        .footer { background-color: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
        .signature { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; font-style: italic; color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">⚠️</div>
            <h1>Processo Pendente</h1>
        </div>
        <div class="content">
            <div class="greeting">Prezado(a) {nome_cliente},</div>

            <div class="message">
                Identificamos que o seu processo está com <strong>pendências</strong> que precisam ser resolvidas.
            </div>

            <div class="urgent-box">
                <div class="title">🚨 ATENÇÃO URGENTE</div>
                <p style="font-size: 16px; margin: 15px 0;">
                    É <strong>fundamental</strong> que você entre em contato conosco <strong>o mais breve possível</strong>
                    para regularizar a situação e evitar prejuízos ao andamento do seu processo.
                </p>
            </div>

            <div class="alert-box">
                <strong>📋 Motivos para o Contato:</strong>
                <ul style="margin: 10px 0;">
                    <li>Documentação pendente</li>
                    <li>Informações complementares necessárias</li>
                    <li>Assinatura de documentos</li>
                    <li>Outras providências necessárias</li>
                </ul>
            </div>

            <div class="contact-methods">
                <div class="contact-item">
                    <div class="icon-circle">📞</div>
                    <div><strong>Telefone</strong></div>
                    <div>(11) 9999-9999</div>
                </div>
                <div class="contact-item">
                    <div class="icon-circle">💬</div>
                    <div><strong>WhatsApp</strong></div>
                    <div>(11) 9999-9999</div>
                </div>
                <div class="contact-item">
                    <div class="icon-circle">📧</div>
                    <div><strong>Email</strong></div>
                    <div>contato@exemplo.com</div>
                </div>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <p style="font-size: 14px; color: #6b7280;">Entre em contato pelos canais acima ou clique no botão:</p>
                <a href="tel:+5511999999999" class="button">📞 Ligar Agora</a>
            </div>

            <div class="signature">
                Cordialmente,<br>
                <strong>{nome_empresa}</strong>
            </div>
        </div>
        <div class="footer">
            <p>⏰ Horário de atendimento: Segunda a Sexta, 9h às 18h</p>
            <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
                © {data} {nome_empresa}. Todos os direitos reservados.
            </p>
        </div>
    </div>
</body>
</html>
    `,
  },

  // Template 3: Processo Finalizado
  processo_finalizado: {
    name: 'Processo Finalizado - Comparecer ao Escritório',
    subject: '✅ Processo Finalizado - Compareça ao Escritório',
    body: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 40px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
        .icon { width: 100px; height: 100px; background-color: #ffffff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 50px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
        .greeting { font-size: 18px; font-weight: 600; color: #16a34a; margin-bottom: 20px; }
        .success-message { background-color: #dcfce7; border: 2px solid #16a34a; padding: 25px; margin: 25px 0; border-radius: 8px; text-align: center; }
        .success-message .title { color: #15803d; font-weight: bold; font-size: 22px; margin-bottom: 15px; }
        .info-box { background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 20px; margin: 25px 0; border-radius: 4px; }
        .next-steps { background-color: #fef3c7; padding: 25px; margin: 25px 0; border-radius: 8px; }
        .next-steps h3 { color: #d97706; margin-top: 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #ffffff !important; padding: 18px 45px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; margin: 20px 0; box-shadow: 0 4px 6px rgba(22, 163, 74, 0.3); }
        .checklist { background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .checklist-item { padding: 12px; margin: 8px 0; background-color: #f9fafb; border-radius: 4px; }
        .footer { background-color: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
        .signature { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; font-style: italic; color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">🎉</div>
            <h1>Processo Finalizado!</h1>
        </div>
        <div class="content">
            <div class="greeting">Parabéns, {nome_cliente}!</div>

            <div class="success-message">
                <div class="title">✅ Seu Processo Foi Finalizado com Sucesso!</div>
                <p style="font-size: 16px; margin: 15px 0;">
                    Temos o prazer de informar que o seu processo judicial foi concluído.
                </p>
            </div>

            <div class="info-box">
                <strong>ℹ️ Informação Importante:</strong>
                <p style="margin: 10px 0;">
                    Para darmos prosseguimento aos trâmites finais e procedimentos necessários,
                    é fundamental que você compareça ao nosso escritório.
                </p>
            </div>

            <div class="next-steps">
                <h3>📋 Próximos Passos:</h3>
                <div class="checklist">
                    <div class="checklist-item">✓ Assinar documentos finais</div>
                    <div class="checklist-item">✓ Receber orientações sobre o resultado</div>
                    <div class="checklist-item">✓ Tratar de eventuais valores/documentos</div>
                    <div class="checklist-item">✓ Esclarecer dúvidas</div>
                </div>
            </div>

            <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <p style="text-align: center; margin: 0; font-size: 16px;">
                    <strong>📍 Endereço do Escritório:</strong><br>
                    Rua Exemplo, 123 - Centro<br>
                    São Paulo - SP<br>
                    CEP: 00000-000
                </p>
            </div>

            <div style="text-align: center;">
                <p style="font-size: 16px; color: #15803d; font-weight: 600;">
                    🕐 Agende seu horário:
                </p>
                <a href="tel:+5511999999999" class="button">📞 Ligar e Agendar</a>
            </div>

            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 25px 0; text-align: center;">
                <strong>⏰ Horário de Atendimento:</strong><br>
                Segunda a Sexta: 9h às 18h<br>
                Sábado: 9h às 12h
            </div>

            <div class="signature">
                Estamos à disposição para atendê-lo(a),<br>
                <strong>{nome_empresa}</strong>
            </div>
        </div>
        <div class="footer">
            <p>🎊 Agradecemos pela confiança em nossos serviços!</p>
            <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
                © {data} {nome_empresa}. Todos os direitos reservados.
            </p>
        </div>
    </div>
</body>
</html>
    `,
  },

  // Template 4: Audiência Marcada
  audiencia_marcada: {
    name: 'Audiência Marcada - Contato Urgente',
    subject: '⚖️ Audiência Marcada - Entre em Contato',
    body: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 40px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
        .icon { width: 80px; height: 80px; background-color: #ffffff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 40px; margin-bottom: 20px; }
        .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
        .greeting { font-size: 18px; font-weight: 600; color: #0284c7; margin-bottom: 20px; }
        .message { font-size: 16px; margin-bottom: 20px; }
        .highlight-box { background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%); border: 2px solid #0284c7; padding: 25px; margin: 25px 0; border-radius: 8px; text-align: center; }
        .highlight-box .title { color: #0369a1; font-weight: bold; font-size: 20px; margin-bottom: 15px; }
        .warning-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 4px; }
        .important-info { background-color: #fee2e2; border: 2px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 8px; }
        .important-info .title { color: #dc2626; font-weight: bold; font-size: 18px; margin-bottom: 10px; text-align: center; }
        .button { display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff !important; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; box-shadow: 0 4px 6px rgba(2, 132, 199, 0.3); }
        .checklist { background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .checklist h4 { color: #0369a1; margin-top: 0; }
        .footer { background-color: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
        .signature { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; font-style: italic; color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">⚖️</div>
            <h1>Audiência Marcada</h1>
        </div>
        <div class="content">
            <div class="greeting">Prezado(a) {nome_cliente},</div>

            <div class="message">
                Temos uma notícia importante sobre o andamento do seu processo:
                a <strong>audiência judicial</strong> foi oficialmente agendada!
            </div>

            <div class="highlight-box">
                <div class="title">📅 AUDIÊNCIA AGENDADA</div>
                <p style="font-size: 16px; margin: 10px 0;">
                    Sua presença é <strong style="color: #dc2626;">OBRIGATÓRIA</strong> e fundamental
                    para o bom andamento do seu processo.
                </p>
            </div>

            <div class="important-info">
                <div class="title">🚨 ATENÇÃO - AÇÃO IMEDIATA NECESSÁRIA</div>
                <p style="margin: 10px 0;">
                    Entre em contato com nosso escritório <strong>URGENTEMENTE</strong> para:
                </p>
                <ul style="text-align: left; display: inline-block; margin: 10px 0;">
                    <li>Confirmar data e horário da audiência</li>
                    <li>Receber orientações sobre como proceder</li>
                    <li>Esclarecer dúvidas sobre o procedimento</li>
                    <li>Preparar documentação necessária</li>
                </ul>
            </div>

            <div class="checklist">
                <h4>📋 O que você precisa saber:</h4>
                <ul style="line-height: 2;">
                    <li><strong>Pontualidade:</strong> Chegue com antecedência ao local</li>
                    <li><strong>Documentos:</strong> Leve RG, CPF e outros que solicitarmos</li>
                    <li><strong>Vestimenta:</strong> Use roupas formais e adequadas</li>
                    <li><strong>Preparação:</strong> Revisaremos juntos os pontos importantes</li>
                </ul>
            </div>

            <div class="warning-box">
                <strong>⚠️ IMPORTANTE:</strong>
                <p style="margin: 10px 0;">
                    A falta à audiência pode resultar em consequências graves para o seu processo,
                    incluindo possível arquivamento ou decisão desfavorável.
                    Por isso, é essencial que você entre em contato conosco imediatamente.
                </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <p style="font-size: 18px; font-weight: 600; color: #0369a1; margin-bottom: 15px;">
                    📞 Entre em Contato Agora:
                </p>
                <a href="tel:+5511999999999" class="button">Ligar para o Escritório</a>
                <p style="font-size: 14px; color: #6b7280; margin-top: 15px;">
                    Ou ligue para: <strong>(11) 9999-9999</strong><br>
                    WhatsApp: <strong>(11) 9999-9999</strong>
                </p>
            </div>

            <div style="background-color: #e0f2fe; padding: 20px; border-radius: 8px; text-align: center;">
                <strong>🕐 Horário de Atendimento:</strong><br>
                Segunda a Sexta: 9h às 18h<br>
                Sábado: 9h às 12h
            </div>

            <div class="signature">
                Conte conosco para orientá-lo(a) em todas as etapas,<br>
                <strong>{nome_empresa}</strong>
            </div>
        </div>
        <div class="footer">
            <p><strong>⚡ Não deixe para depois! Entre em contato hoje mesmo.</strong></p>
            <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
                © {data} {nome_empresa}. Todos os direitos reservados.
            </p>
        </div>
    </div>
</body>
</html>
    `,
  },
};

/**
 * Substitui variáveis no template
 * SEGURANCA: Todas as variaveis sao sanitizadas para prevenir XSS
 */
export function replaceTemplateVariables(
  template: string,
  variables: {
    nome_cliente?: string;
    nome_empresa?: string;
    data?: string;
  }
): string {
  let result = template;

  // SEGURANCA: Sanitizar todas as variaveis antes de inserir no template HTML
  const safeNomeCliente = sanitizeForTemplate(variables.nome_cliente) || '[Nome do Cliente]';
  const safeNomeEmpresa = sanitizeForTemplate(variables.nome_empresa) || '[Nome da Empresa]';
  const safeData = sanitizeForTemplate(variables.data) || new Date().getFullYear().toString();

  // Substituir variáveis com valores sanitizados
  result = result.replace(/{nome_cliente}/g, safeNomeCliente);
  result = result.replace(/{nome_empresa}/g, safeNomeEmpresa);
  result = result.replace(/{data}/g, safeData);

  return result;
}
