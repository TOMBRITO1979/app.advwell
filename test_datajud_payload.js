const axios = require('axios');

async function testDatajudAPI() {
  const processNumber = '01127725820248190001'; // Sem formatação
  const tribunal = 'tjrj';
  const apiKey = process.env.DATAJUD_API_KEY;
  const baseUrl = 'https://api-publica.datajud.cnj.jus.br';

  try {
    const url = `${baseUrl}/api_publica_${tribunal}/_search`;

    console.log('Consultando API DataJud...');
    console.log('URL:', url);
    console.log('Processo:', processNumber);
    console.log('');

    const response = await axios.post(
      url,
      {
        query: {
          match: {
            numeroProcesso: processNumber,
          },
        },
      },
      {
        headers: {
          Authorization: `ApiKey ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data?.hits?.hits?.length > 0) {
      const hits = response.data.hits.hits;

      console.log(`✅ Encontrado! Total de graus: ${hits.length}`);
      console.log('');

      // Pegar os primeiros 3 movimentos do primeiro grau
      const firstCase = hits[0]._source;
      const movimentos = firstCase.movimentos || [];

      console.log(`📋 Total de movimentos: ${movimentos.length}`);
      console.log('');
      console.log('=== PRIMEIROS 3 MOVIMENTOS (PAYLOAD COMPLETO) ===');
      console.log('');

      movimentos.slice(0, 3).forEach((mov, index) => {
        console.log(`--- Movimento ${index + 1} ---`);
        console.log(JSON.stringify(mov, null, 2));
        console.log('');
      });

      // Mostrar especificamente o movimento "Remessa"
      const remessa = movimentos.find(m => m.nome && m.nome.includes('Remessa'));
      if (remessa) {
        console.log('=== MOVIMENTO "REMESSA" COMPLETO ===');
        console.log(JSON.stringify(remessa, null, 2));
        console.log('');
      }

      // Mostrar movimento com descrição longa
      const comDescricao = movimentos.find(m =>
        m.complementosTabelados &&
        m.complementosTabelados.some(c => c.descricao && c.descricao.length > 50)
      );
      if (comDescricao) {
        console.log('=== MOVIMENTO COM DESCRIÇÃO LONGA ===');
        console.log(JSON.stringify(comDescricao, null, 2));
      }

    } else {
      console.log('❌ Processo não encontrado');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testDatajudAPI();
