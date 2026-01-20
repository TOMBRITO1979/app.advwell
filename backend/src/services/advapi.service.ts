import axios, { AxiosInstance } from 'axios';
import { appLogger } from '../utils/logger';

/**
 * Service para integração com ADVAPI v2
 * API para consulta de publicações do Diário Oficial por OAB
 *
 * Documentação: /root/projects/advwell/advapi-v2/INTEGRACAO_ADVWELL.md
 *
 * Endpoints:
 * - GET /api/consulta/buffer - Consultar publicações (resposta instantânea)
 * - POST /api/consulta - Cadastrar advogado para monitoramento
 * - GET /api/advogados - Listar advogados cadastrados
 */

// Interfaces da API conforme resposta real da ADVAPI
export interface AdvApiPublicacao {
  id: string;
  numeroProcesso: string;
  siglaTribunal: string;
  dataPublicacao: string | null;
  dataDisponibilizacao?: string;
  tipoComunicacao?: string;
  textoComunicacao?: string;
  textoLimpo?: string;
  parteAutor?: string;
  parteReu?: string;
  comarca?: string;
  classeProcessual?: string;
  // Campos alternativos para compatibilidade
  tribunal?: string;
  texto?: string;
}

export interface AdvApiAdvogado {
  id: string;
  nome: string;
  oab: string;
  uf: string;
}

export interface AdvApiBufferResponse {
  encontrado: boolean;
  advogado?: AdvApiAdvogado;
  publicacoes: AdvApiPublicacao[];
  total: number;
  ultimaAtualizacao?: string;
  message?: string;
}

export interface AdvApiCadastroResponse {
  message: string;
  jobIds?: string[];
  advogados?: number;
  error?: string;
}

export interface AdvApiAdvogadosResponse {
  advogados: AdvApiAdvogado[];
  total: number;
}

export class AdvApiService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || process.env.ADVAPI_BASE_URL || 'https://api.advtom.com';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000, // 60 segundos
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
    });

    // Interceptor para logging
    this.client.interceptors.request.use((config) => {
      appLogger.debug('ADVAPI Request', {
        method: config.method,
        url: config.url,
        params: config.params,
      });
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        appLogger.debug('ADVAPI Response', {
          status: response.status,
          encontrado: response.data?.encontrado,
          total: response.data?.total || response.data?.publicacoes?.length,
        });
        return response;
      },
      (error) => {
        appLogger.error('ADVAPI Error', error as Error, {
          status: error.response?.status,
          data: error.response?.data,
        });
        throw error;
      }
    );
  }

  /**
   * Consultar publicações do buffer (resposta instantânea)
   *
   * GET /api/consulta/buffer
   *
   * Retorna publicações já armazenadas no banco de dados.
   * Se o advogado não estiver cadastrado, retorna encontrado: false
   */
  async consultarBuffer(
    companyId: string,
    advogadoNome: string,
    dataInicio?: string,
    dataFim?: string
  ): Promise<AdvApiBufferResponse> {
    try {
      const params: Record<string, string> = {
        companyId,
        advogadoNome,
      };
      if (dataInicio) params.dataInicio = dataInicio;
      if (dataFim) params.dataFim = dataFim;

      const response = await this.client.get<AdvApiBufferResponse>('/api/consulta/buffer', { params });

      appLogger.info('ADVAPI: Buffer consultado', {
        companyId,
        advogadoNome,
        encontrado: response.data.encontrado,
        total: response.data.total || 0,
      });

      return response.data;
    } catch (error: any) {
      appLogger.error('ADVAPI: Erro ao consultar buffer', error as Error, {
        companyId,
        advogadoNome,
      });

      return {
        encontrado: false,
        publicacoes: [],
        total: 0,
        message: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * Cadastrar advogado para monitoramento
   *
   * POST /api/consulta
   *
   * Cadastra um novo advogado e inicia o monitoramento de publicações.
   * A raspagem ocorre automaticamente entre 7h-21h, segunda a sábado.
   *
   * O callbackUrl é enviado para que a ADVAPI possa notificar o AdvWell
   * quando novas publicações forem encontradas.
   */
  async cadastrarAdvogado(
    companyId: string,
    nome: string,
    oab: string,
    uf: string
  ): Promise<AdvApiCadastroResponse> {
    try {
      // URL do webhook para receber callbacks da ADVAPI
      const callbackUrl = process.env.ADVAPI_CALLBACK_URL || 'https://api.advwell.pro/api/advapi-webhook';

      const response = await this.client.post<AdvApiCadastroResponse>('/api/consulta', {
        companyId,
        advogadoNome: nome,
        oab,
        uf,
        callbackUrl,
      });

      appLogger.info('ADVAPI: Advogado cadastrado', {
        companyId,
        advogadoNome: nome,
        oab,
        uf,
        message: response.data.message,
      });

      return response.data;
    } catch (error: any) {
      appLogger.error('ADVAPI: Erro ao cadastrar advogado', error as Error, {
        companyId,
        nome,
        oab,
        uf,
      });

      return {
        message: 'Erro ao cadastrar advogado',
        error: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * Listar advogados cadastrados na empresa
   *
   * GET /api/advogados
   */
  async listarAdvogados(companyId: string): Promise<AdvApiAdvogadosResponse> {
    try {
      const response = await this.client.get<AdvApiAdvogadosResponse>('/api/advogados', {
        params: { companyId },
      });

      return {
        advogados: response.data.advogados || response.data as any || [],
        total: response.data.total || (response.data.advogados?.length || 0),
      };
    } catch (error) {
      appLogger.error('ADVAPI: Erro ao listar advogados', error as Error, { companyId });
      return { advogados: [], total: 0 };
    }
  }

  /**
   * Verificar se a API está disponível
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// Singleton para uso global
let defaultAdvApiService: AdvApiService | null = null;

export function getAdvApiService(apiKey?: string): AdvApiService {
  const key = apiKey || process.env.ADVAPI_API_KEY;

  if (!key) {
    throw new Error('ADVAPI_API_KEY não configurada');
  }

  if (!defaultAdvApiService || apiKey) {
    defaultAdvApiService = new AdvApiService(key);
  }

  return defaultAdvApiService;
}
