import axios from 'axios';
import { config } from '../config';

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
}

export class DatajudService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = config.datajud.apiKey;
    this.baseUrl = config.datajud.baseUrl;
  }

  async searchCase(processNumber: string, tribunal: string = 'tjrj'): Promise<DatajudCase | null> {
    try {
      const url = `${this.baseUrl}/api_publica_${tribunal}/_search`;

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

          console.log(`Processo ${processNumber}: Combinados ${hits.length} graus (${allMovements.length} movimentos totais, ${uniqueMovements.length} únicos)`);
        }

        return firstCase;
      }

      return null;
    } catch (error) {
      console.error('Erro ao consultar DataJud:', error);
      throw new Error('Erro ao consultar processo no DataJud');
    }
  }

  async searchCaseAllTribunals(processNumber: string): Promise<DatajudCase | null> {
    const tribunals = ['tjrj', 'tjsp', 'tjmg', 'trf1', 'trf2', 'trf3', 'trf4', 'trf5'];

    for (const tribunal of tribunals) {
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
