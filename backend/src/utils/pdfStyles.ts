import PDFDocument from 'pdfkit';

// Cores do tema (Verde - cor principal do app)
export const colors = {
  primary: '#059669',      // Verde escuro (emerald-600)
  primaryLight: '#10b981', // Verde claro (emerald-500)
  primaryDark: '#047857',  // Verde mais escuro (emerald-700)
  secondary: '#34d399',    // Verde menta (emerald-400) - para contraste
  // Cores suaves para cards de resumo
  cardGreen: '#86efac',    // Verde suave (green-300) - total faturado
  cardBlue: '#93c5fd',     // Azul suave (blue-300) - total devido
  cardRed: '#fca5a5',      // Vermelho suave (red-300) - total pago
  cardOrange: '#fdba74',   // Laranja suave (orange-300) - pendente
  cardGray: '#d1d5db',     // Cinza suave (gray-300) - neutro
  info: '#3b82f6',         // Azul (blue-500)
  danger: '#dc2626',       // Vermelho
  warning: '#d97706',      // Laranja
  success: '#16a34a',      // Verde sucesso
  gray: '#6b7280',         // Cinza
  grayLight: '#f3f4f6',    // Cinza claro (background)
  grayDark: '#374151',     // Cinza escuro
  white: '#ffffff',
  black: '#111827',
};

// Configurações de fonte
export const fonts = {
  title: 24,
  subtitle: 16,
  heading: 14,
  body: 10,
  small: 9,
  tiny: 8,
};

/**
 * Adiciona cabeçalho moderno ao PDF
 */
export function addHeader(
  doc: PDFKit.PDFDocument,
  title: string,
  subtitle?: string,
  companyName?: string
) {
  const pageWidth = doc.page.width;
  const margin = doc.page.margins.left;
  const headerHeight = 80;

  // Background do header
  doc
    .rect(0, 0, pageWidth, headerHeight)
    .fill(colors.primary);

  // Título
  doc
    .fillColor(colors.white)
    .fontSize(fonts.title)
    .text(title, margin, 25, {
      width: pageWidth - margin * 2,
      align: 'center',
    });

  // Subtítulo
  if (subtitle) {
    doc
      .fontSize(fonts.body)
      .text(subtitle, margin, 55, {
        width: pageWidth - margin * 2,
        align: 'center',
      });
  }

  // Nome da empresa (canto superior direito)
  if (companyName) {
    doc
      .fontSize(fonts.small)
      .text(companyName, margin, 10, {
        width: pageWidth - margin * 2,
        align: 'right',
      });
  }

  // Reset color
  doc.fillColor(colors.black);
  doc.y = headerHeight + 20;
}

/**
 * Adiciona rodapé simples ao PDF (apenas na página atual)
 */
export function addFooter(doc: PDFKit.PDFDocument, pageNumber?: number, totalPages?: number) {
  const pageWidth = doc.page.width;
  const margin = doc.page.margins.left;

  // Posicionar 20 pontos abaixo da posição atual
  const footerY = doc.y + 20;

  // Linha separadora
  doc
    .strokeColor(colors.grayLight)
    .lineWidth(0.5)
    .moveTo(margin, footerY)
    .lineTo(pageWidth - margin, footerY)
    .stroke();

  // Preparar textos do rodapé (sempre no timezone de São Paulo)
  const dateText = `Gerado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;
  const pageText = pageNumber && totalPages
    ? `Página ${pageNumber} de ${totalPages}`
    : pageNumber
    ? `Página ${pageNumber}`
    : '';

  // Configurar fonte e cor
  doc.font('Helvetica').fontSize(fonts.tiny).fillColor(colors.gray);

  // Desenhar data à esquerda
  doc.text(dateText, margin, footerY + 8, { lineBreak: false });

  // Desenhar número da página à direita
  if (pageText) {
    const pageTextWidth = doc.widthOfString(pageText);
    doc.text(pageText, pageWidth - margin - pageTextWidth, footerY + 8, { lineBreak: false });
  }

  doc.fillColor(colors.black);
}

/**
 * @deprecated Para documentos multi-página, considere outra abordagem
 */
export function addFootersToAllPages(doc: PDFKit.PDFDocument) {
  // Chamar addFooter uma vez é suficiente para a última página
  addFooter(doc, 1, 1);
}

/**
 * Adiciona card de resumo (box colorido)
 */
export function addSummaryCard(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  value: string,
  bgColor: string = colors.primaryLight
) {
  // Cores claras (pastel) que precisam de texto escuro
  const lightColors = [colors.cardGreen, colors.cardBlue, colors.cardRed, colors.cardOrange, colors.cardGray];
  const textColor = lightColors.includes(bgColor) ? colors.grayDark : colors.white;

  // Background do card
  doc
    .roundedRect(x, y, width, height, 5)
    .fill(bgColor);

  // Título do card
  doc
    .fillColor(textColor)
    .fontSize(fonts.small)
    .text(title, x + 10, y + 10, { width: width - 20 });

  // Valor do card
  doc
    .fontSize(fonts.subtitle)
    .text(value, x + 10, y + 28, { width: width - 20 });

  doc.fillColor(colors.black);
}

/**
 * Adiciona seção com título
 */
export function addSection(doc: PDFKit.PDFDocument, title: string) {
  const margin = doc.page.margins.left;
  const pageWidth = doc.page.width;

  // Linha decorativa à esquerda
  const yPos = doc.y;
  doc
    .rect(margin, yPos, 4, 20)
    .fill(colors.primary);

  // Título da seção
  doc
    .fillColor(colors.primary)
    .fontSize(fonts.heading)
    .text(title, margin + 12, yPos + 3);

  doc.fillColor(colors.black);
  doc.moveDown(0.5);

  // Linha separadora
  doc
    .strokeColor(colors.grayLight)
    .lineWidth(1)
    .moveTo(margin, doc.y)
    .lineTo(pageWidth - margin, doc.y)
    .stroke();

  doc.moveDown(0.5);
}

/**
 * Adiciona tabela moderna
 */
export function addTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: string[][],
  columnWidths: number[],
  options: {
    headerBgColor?: string;
    headerTextColor?: string;
    alternateRowColor?: string;
    showBorders?: boolean;
  } = {}
) {
  const {
    headerBgColor = colors.primary,
    headerTextColor = colors.white,
    alternateRowColor = colors.grayLight,
    showBorders = true,
  } = options;

  const margin = doc.page.margins.left;
  const startX = margin;
  let startY = doc.y;
  const rowHeight = 25;
  const headerHeight = 30;
  const padding = 5;

  // Calcular largura total
  const totalWidth = columnWidths.reduce((a, b) => a + b, 0);

  // Desenhar header
  doc
    .rect(startX, startY, totalWidth, headerHeight)
    .fill(headerBgColor);

  doc
    .fillColor(headerTextColor)
    .fontSize(fonts.small);

  let currentX = startX;
  headers.forEach((header, i) => {
    doc.text(header, currentX + padding, startY + 8, {
      width: columnWidths[i] - padding * 2,
      align: 'left',
    });
    currentX += columnWidths[i];
  });

  startY += headerHeight;

  // Desenhar linhas
  doc.fillColor(colors.black).fontSize(fonts.small);

  rows.forEach((row, rowIndex) => {
    // Verificar se precisa de nova página
    if (startY + rowHeight > doc.page.height - 60) {
      doc.addPage();
      startY = doc.page.margins.top;
    }

    // Background alternado
    if (rowIndex % 2 === 1) {
      doc
        .rect(startX, startY, totalWidth, rowHeight)
        .fill(alternateRowColor);
      doc.fillColor(colors.black);
    }

    // Bordas
    if (showBorders) {
      doc
        .strokeColor(colors.grayLight)
        .lineWidth(0.5)
        .rect(startX, startY, totalWidth, rowHeight)
        .stroke();
    }

    // Conteúdo das células
    currentX = startX;
    row.forEach((cell, i) => {
      doc.text(cell || '-', currentX + padding, startY + 7, {
        width: columnWidths[i] - padding * 2,
        align: 'left',
        lineBreak: false,
      });
      currentX += columnWidths[i];
    });

    startY += rowHeight;
  });

  doc.y = startY + 10;
}

/**
 * Adiciona informação em formato chave: valor
 */
export function addKeyValue(
  doc: PDFKit.PDFDocument,
  key: string,
  value: string,
  options: { bold?: boolean; indent?: number } = {}
) {
  const { bold = false, indent = 0 } = options;
  const margin = doc.page.margins.left + indent;

  doc
    .fontSize(fonts.body)
    .fillColor(colors.gray)
    .text(`${key}: `, margin, doc.y, { continued: true })
    .fillColor(colors.black)
    .text(value, { continued: false });
}

/**
 * Adiciona linha divisória
 */
export function addDivider(doc: PDFKit.PDFDocument, style: 'solid' | 'dashed' = 'solid') {
  const margin = doc.page.margins.left;
  const pageWidth = doc.page.width;

  doc.moveDown(0.5);

  if (style === 'dashed') {
    doc
      .strokeColor(colors.grayLight)
      .lineWidth(1)
      .dash(5, { space: 3 })
      .moveTo(margin, doc.y)
      .lineTo(pageWidth - margin, doc.y)
      .stroke()
      .undash();
  } else {
    doc
      .strokeColor(colors.grayLight)
      .lineWidth(1)
      .moveTo(margin, doc.y)
      .lineTo(pageWidth - margin, doc.y)
      .stroke();
  }

  doc.moveDown(0.5);
}

/**
 * Adiciona badge/tag colorido
 */
export function addBadge(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  bgColor: string = colors.primary
) {
  const textWidth = doc.widthOfString(text) + 10;
  const textHeight = 16;

  doc
    .roundedRect(x, y, textWidth, textHeight, 3)
    .fill(bgColor);

  doc
    .fillColor(colors.white)
    .fontSize(fonts.tiny)
    .text(text, x + 5, y + 4);

  doc.fillColor(colors.black);

  return textWidth;
}

/**
 * Formata valor monetário
 */
export function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formata data (sempre no timezone de São Paulo)
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}
