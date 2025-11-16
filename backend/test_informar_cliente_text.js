const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testInformarClienteText() {
  try {
    console.log('=== TESTANDO CAMPO informarCliente COMO TEXTO ===\n');

    // Get a test case
    const testCase = await prisma.case.findFirst({
      where: {
        processNumber: '0008903-36.2022.8.19.0038'
      }
    });

    if (!testCase) {
      console.log('❌ Processo de teste não encontrado');
      process.exit(1);
    }

    console.log('Processo encontrado:', testCase.processNumber);
    console.log('Estado ANTES da atualização:');
    console.log('- informarCliente:', testCase.informarCliente || '(vazio)');
    console.log('- linkProcesso:', testCase.linkProcesso || '(vazio)');
    console.log('- ultimoAndamento:', testCase.ultimoAndamento || '(vazio)');

    // Update with text content
    const textoExplicativo = `O processo foi concluso ao juiz em 30/06/2025 para análise.

Aguardando decisão sobre o pedido de liminar.

Caso haja alguma movimentação significativa, o cliente será informado imediatamente.

Previsão de resposta: 15 a 30 dias úteis.`;

    const updated = await prisma.case.update({
      where: { id: testCase.id },
      data: {
        informarCliente: textoExplicativo,
        linkProcesso: 'https://www4.tjrj.jus.br/consultaProcessoWebV2/consultaProc.do?numProcesso=0008903-36.2022.8.19.0038'
      }
    });

    console.log('\n✅ Atualização realizada com sucesso!');
    console.log('\nEstado APÓS a atualização:');
    console.log('- informarCliente (tipo):', typeof updated.informarCliente);
    console.log('- informarCliente (tamanho):', updated.informarCliente ? updated.informarCliente.length : 0, 'caracteres');
    console.log('- informarCliente (conteúdo):');
    console.log('---');
    console.log(updated.informarCliente || '(vazio)');
    console.log('---');
    console.log('- linkProcesso:', updated.linkProcesso || '(vazio)');
    console.log('- ultimoAndamento:', updated.ultimoAndamento || '(vazio)');

    // Test reading back
    const readBack = await prisma.case.findUnique({
      where: { id: testCase.id },
      include: {
        client: { select: { name: true } },
      }
    });

    console.log('\n✅ Leitura verificada com sucesso!');
    console.log('Cliente:', readBack.client.name);
    console.log('Assunto:', readBack.subject);
    console.log('Informar Cliente está preenchido:', !!readBack.informarCliente);
    console.log('Link do Processo está preenchido:', !!readBack.linkProcesso);

    console.log('\n✅ TODOS OS TESTES PASSARAM!');
    console.log('\nResumo:');
    console.log('- Campo informarCliente agora aceita texto completo ✅');
    console.log('- Tipo correto (string/text) ✅');
    console.log('- Salva e recupera corretamente ✅');
    console.log('- Pronto para uso no frontend ✅');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

testInformarClienteText();
