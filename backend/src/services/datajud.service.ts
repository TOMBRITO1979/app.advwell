import axios from 'axios';
import { config } from '../config';
import { appLogger } from '../utils/logger';

/**
 * TAREFA 5.2: Whitelist de tribunais validos do DataJud
 * Previne SSRF e garante que apenas endpoints legitimos sejam acessados
 * Lista baseada na documentacao oficial do CNJ: https://datajud-wiki.cnj.jus.br/
 */
const VALID_TRIBUNALS = new Set([
  // Tribunais de Justica Estaduais
  'tjac', 'tjal', 'tjam', 'tjap', 'tjba', 'tjce', 'tjdft', 'tjes', 'tjgo',
  'tjma', 'tjmg', 'tjms', 'tjmt', 'tjpa', 'tjpb', 'tjpe', 'tjpi', 'tjpr',
  'tjrj', 'tjrn', 'tjro', 'tjrr', 'tjrs', 'tjsc', 'tjse', 'tjsp', 'tjto',
  // Tribunais Regionais Federais
  'trf1', 'trf2', 'trf3', 'trf4', 'trf5', 'trf6',
  // Tribunais do Trabalho
  'trt1', 'trt2', 'trt3', 'trt4', 'trt5', 'trt6', 'trt7', 'trt8', 'trt9',
  'trt10', 'trt11', 'trt12', 'trt13', 'trt14', 'trt15', 'trt16', 'trt17',
  'trt18', 'trt19', 'trt20', 'trt21', 'trt22', 'trt23', 'trt24',
  // Tribunais Superiores
  'stf', 'stj', 'tst', 'stm', 'tse',
  // Tribunais Eleitorais
  'tre-ac', 'tre-al', 'tre-am', 'tre-ap', 'tre-ba', 'tre-ce', 'tre-df',
  'tre-es', 'tre-go', 'tre-ma', 'tre-mg', 'tre-ms', 'tre-mt', 'tre-pa',
  'tre-pb', 'tre-pe', 'tre-pi', 'tre-pr', 'tre-rj', 'tre-rn', 'tre-ro',
  'tre-rr', 'tre-rs', 'tre-sc', 'tre-se', 'tre-sp', 'tre-to',
  // Tribunais Militares
  'tjmsp', 'tjmmg', 'tjmrs',
]);

/**
 * Valida se o codigo do tribunal e valido
 */
const isValidTribunal = (tribunal: string): boolean => {
  if (!tribunal || typeof tribunal !== 'string') return false;
  return VALID_TRIBUNALS.has(tribunal.toLowerCase().trim());
};

export interface DatajudMovement {
  codigo: number;
  nome: string;
  dataHora: string;
  complementosTabelados?: Array<{
    codigo: number;
    valor: number;
    nome: string;
    descricao: string;
  }>;
}

// Interface para prioridade processual (MTD 1.2)
export interface DatajudPrioridade {
  tipoPrioridade: string; // ID=Idoso, PD=Pessoa com Deficiência, etc
  dataConcessao?: string;
  dataFim?: string;
}

// Interface para parte/pessoa (MTD 1.2)
export interface DatajudParte {
  nome?: string;
  tipoParte?: string;
  polo?: string;
  racaCor?: string; // BC, PD, PR, IN, AM, ND
  prioridade?: DatajudPrioridade[];
}

export interface DatajudCase {
  numeroProcesso: string;
  classe?: {
    codigo: number;
    nome: string;
  };
  tribunal: string;
  dataAjuizamento?: string;
  dataHoraUltimaAtualizacao?: string;
  assuntos?: Array<{
    codigo: number;
    nome: string;
  }>;
  orgaoJulgador?: {
    codigo: number;
    nome: string;
  };
  movimentos?: DatajudMovement[];
  // Campos MTD 1.2
  numeroBoletimOcorrencia?: string[];
  numeroInqueritoPolicial?: string[];
  partes?: DatajudParte[];
}

export class DatajudService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = config.datajud.apiKey;
    this.baseUrl = config.datajud.baseUrl;
  }

  async searchCase(processNumber: string, tribunal: string = 'tjrj'): Promise<DatajudCase | null> {
    // TAREFA 5.2: Validar tribunal contra whitelist para prevenir SSRF
    const normalizedTribunal = tribunal.toLowerCase().trim();
    if (!isValidTribunal(normalizedTribunal)) {
      appLogger.warn('DataJud: Tribunal invalido rejeitado', { tribunal });
      throw new Error(`Tribunal inválido: ${tribunal}`);
    }

    try {
      const url = `${this.baseUrl}/api_publica_${normalizedTribunal}/_search`;

      const response = await axios.post(
        url,
        {
          query: {
            match: {
              numeroProcesso: processNumber.replace(/\D/g, ''), // Remove caracteres não numéricos
            },
          },
        },
        {
          headers: {
            Authorization: `ApiKey ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data?.hits?.hits?.length > 0) {
        const hits = response.data.hits.hits;

        // Pega o primeiro hit como base (geralmente G1)
        const firstCase = hits[0]._source as DatajudCase;

        // Se houver múltiplos hits (múltiplos graus - G1, G2, G3, etc.), combina todos os movimentos
        if (hits.length > 1) {
          const allMovements: DatajudMovement[] = [];

          hits.forEach((hit: any) => {
            const caseData = hit._source;
            if (caseData.movimentos && caseData.movimentos.length > 0) {
              allMovements.push(...caseData.movimentos);
            }
          });

          // Remove duplicatas baseado em codigo + dataHora + nome
          const uniqueMovements = Array.from(
            new Map(
              allMovements.map(m => [`${m.codigo}_${m.dataHora}_${m.nome}`, m])
            ).values()
          );

          firstCase.movimentos = uniqueMovements;

          appLogger.info('DataJud: Processo com multiplos graus combinados', {
            processNumber,
            gradesCount: hits.length,
            totalMovements: allMovements.length,
            uniqueMovements: uniqueMovements.length,
          });
        }

        return firstCase;
      }

      return null;
    } catch (error) {
      appLogger.error('Erro ao consultar DataJud', error as Error);
      throw new Error('Erro ao consultar processo no DataJud');
    }
  }

  /**
   * Extrai o tribunal do número do processo no formato CNJ
   * Formato: NNNNNNN-DD.AAAA.J.TR.OOOO
   * J = Justiça (1=STF, 2=STJ, 3=JF, 4=JM, 5=JT, 6=JE, 8=Est, 9=JME)
   * TR = Tribunal/Região
   */
  private extractTribunalFromProcessNumber(processNumber: string): string | null {
    // Formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
    const match = processNumber.match(/^\d{7}-\d{2}\.\d{4}\.(\d)\.(\d{2})\.\d{4}$/);
    if (!match) return null;

    const justica = match[1];
    const tribunal = match[2];

    // Mapeamento por tipo de justiça
    switch (justica) {
      case '1': return 'stf';
      case '2': return 'stj';
      case '3': // Justiça Federal
        return `trf${tribunal}`;
      case '4': return 'stm'; // Justiça Militar da União
      case '5': // Justiça do Trabalho
        return `trt${parseInt(tribunal, 10)}`;
      case '6': // Justiça Eleitoral
        return `tre-${this.getStateCodeFromTribunal(tribunal)}`;
      case '8': // Justiça Estadual
        return this.getStateTribunal(tribunal);
      case '9': // Justiça Militar Estadual
        return this.getMilitaryTribunal(tribunal);
      default:
        return null;
    }
  }

  private getStateTribunal(code: string): string {
    const stateMap: Record<string, string> = {
      '01': 'tjac', '02': 'tjal', '03': 'tjap', '04': 'tjam', '05': 'tjba',
      '06': 'tjce', '07': 'tjdft', '08': 'tjes', '09': 'tjgo', '10': 'tjma',
      '11': 'tjmt', '12': 'tjms', '13': 'tjmg', '14': 'tjpa', '15': 'tjpb',
      '16': 'tjpr', '17': 'tjpe', '18': 'tjpi', '19': 'tjrj', '20': 'tjrn',
      '21': 'tjrs', '22': 'tjro', '23': 'tjrr', '24': 'tjsc', '25': 'tjse',
      '26': 'tjsp', '27': 'tjto',
    };
    return stateMap[code] || 'tjsp';
  }

  private getStateCodeFromTribunal(code: string): string {
    const stateMap: Record<string, string> = {
      '01': 'ac', '02': 'al', '03': 'ap', '04': 'am', '05': 'ba',
      '06': 'ce', '07': 'dft', '08': 'es', '09': 'go', '10': 'ma',
      '11': 'mt', '12': 'ms', '13': 'mg', '14': 'pa', '15': 'pb',
      '16': 'pr', '17': 'pe', '18': 'pi', '19': 'rj', '20': 'rn',
      '21': 'rs', '22': 'ro', '23': 'rr', '24': 'sc', '25': 'se',
      '26': 'sp', '27': 'to',
    };
    return stateMap[code] || 'sp';
  }

  private getMilitaryTribunal(code: string): string {
    const militaryMap: Record<string, string> = {
      '13': 'tjmmg', '21': 'tjmrs', '26': 'tjmsp',
    };
    return militaryMap[code] || 'tjmsp';
  }

  async searchCaseAllTribunals(processNumber: string): Promise<DatajudCase | null> {
    // Primeiro, tenta identificar o tribunal pelo número do processo
    const identifiedTribunal = this.extractTribunalFromProcessNumber(processNumber);

    if (identifiedTribunal) {
      appLogger.info('DataJud: Tribunal identificado pelo número do processo', {
        processNumber,
        tribunal: identifiedTribunal,
      });

      try {
        const result = await this.searchCase(processNumber, identifiedTribunal);
        if (result) {
          return result;
        }
      } catch (error) {
        appLogger.warn('DataJud: Tribunal identificado não retornou resultados', {
          processNumber,
          tribunal: identifiedTribunal,
        });
      }
    }

    // Se não identificou ou não encontrou, busca em todos os tribunais
    // Lista completa: Superiores + Federal + Estadual + Trabalho
    const allTribunals = [
      // Tribunais Superiores
      'stj', 'tst', 'stm', 'tse',
      // Justiça Federal (TRF1-TRF6)
      'trf1', 'trf2', 'trf3', 'trf4', 'trf5', 'trf6',
      // Justiça do Trabalho (TRT1-TRT24)
      'trt1', 'trt2', 'trt3', 'trt4', 'trt5', 'trt6', 'trt7', 'trt8',
      'trt9', 'trt10', 'trt11', 'trt12', 'trt13', 'trt14', 'trt15', 'trt16',
      'trt17', 'trt18', 'trt19', 'trt20', 'trt21', 'trt22', 'trt23', 'trt24',
      // Justiça Estadual (27 TJs)
      'tjac', 'tjal', 'tjam', 'tjap', 'tjba', 'tjce', 'tjdft', 'tjes',
      'tjgo', 'tjma', 'tjmg', 'tjms', 'tjmt', 'tjpa', 'tjpb', 'tjpe',
      'tjpi', 'tjpr', 'tjrj', 'tjrn', 'tjro', 'tjrr', 'tjrs', 'tjsc',
      'tjse', 'tjsp', 'tjto',
    ];

    for (const tribunal of allTribunals) {
      // Pula se já tentou este tribunal
      if (tribunal === identifiedTribunal) continue;

      try {
        const result = await this.searchCase(processNumber, tribunal);
        if (result) {
          return result;
        }
      } catch (error) {
        // Continua para o próximo tribunal
        continue;
      }
    }

    return null;
  }
}

export default new DatajudService();
