import axios, { AxiosInstance } from 'axios';
import { appLogger } from '../utils/logger';

/**
 * Service para integração com ADVAPI v2
 * API para consulta de publicações do Diário Oficial por OAB
 *
 * Documentação: https://github.com/TOMBRITO1979/advapi-v2
 */

// Interfaces da API
export interface AdvApiConsultaRequest {
  companyId: string;
  advogadoNome: string;
  advogadoOab: string;
  ufOab: string;
  tribunais?: string[];
  dataInicio: string; // YYYY-MM-DD
  dataFim: string;    // YYYY-MM-DD
  callbackUrl?: string;
}

export interface AdvApiConsultaResponse {
  success: boolean;
  consultaId?: string;
  message?: string;
  error?: string;
}

export interface AdvApiConsultaStatus {
  consultaId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalPublicacoes?: number;
  processedCount?: number;
  errorMessage?: string;
}

export interface AdvApiPublicacao {
  id: string;
  numeroProcesso: string;
  siglaTribunal: string;
  dataPublicacao: string;
  tipoComunicacao?: string;
  textoComunicacao?: string;
  advogadoId: string;
  advogadoNome: string;
}

export interface AdvApiPublicacoesResponse {
  success: boolean;
  publicacoes: AdvApiPublicacao[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
    });

    // Interceptor para logging
    this.client.interceptors.request.use((config) => {
      appLogger.debug('ADVAPI Request', {
        method: config.method,
        url: config.url,
        data: config.data,
      });
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        appLogger.debug('ADVAPI Response', {
          status: response.status,
          data: response.data,
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
   * Iniciar uma consulta de publicações para um advogado
   *
   * API ADVAPI:
   * POST /api/consulta
   * Body: { companyId, advogadoNome, callbackUrl }
   */
  async iniciarConsulta(request: AdvApiConsultaRequest): Promise<AdvApiConsultaResponse> {
    try {
      // Construir callbackUrl se não fornecida
      const callbackUrl = request.callbackUrl ||
        `${process.env.API_URL || 'https://api.advwell.pro'}/api/advapi-webhook`;

      const response = await this.client.post<AdvApiConsultaResponse>('/api/consulta', {
        companyId: request.companyId,
        advogadoNome: request.advogadoNome,
        advogadoOab: request.advogadoOab,
        ufOab: request.ufOab,
        callbackUrl,
      });

      appLogger.info('ADVAPI: Consulta iniciada', {
        companyId: request.companyId,
        advogadoNome: request.advogadoNome,
        callbackUrl,
      });

      return response.data;
    } catch (error: any) {
      appLogger.error('ADVAPI: Erro ao iniciar consulta', error as Error, {
        request: { advogadoOab: request.advogadoOab, ufOab: request.ufOab },
      });

      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao iniciar consulta',
      };
    }
  }

  /**
   * Verificar status de uma consulta
   */
  async verificarStatusConsulta(consultaId: string): Promise<AdvApiConsultaStatus | null> {
    try {
      const response = await this.client.get<AdvApiConsultaStatus>(`/api/consulta/${consultaId}/status`);
      return response.data;
    } catch (error) {
      appLogger.error('ADVAPI: Erro ao verificar status da consulta', error as Error, {
        consultaId,
      });
      return null;
    }
  }

  /**
   * Listar publicações encontradas
   */
  async listarPublicacoes(
    advogadoOab: string,
    ufOab: string,
    page: number = 1,
    pageSize: number = 50,
    dataInicio?: string,
    dataFim?: string
  ): Promise<AdvApiPublicacoesResponse> {
    try {
      const params: Record<string, any> = {
        advogadoOab,
        ufOab,
        page,
        pageSize,
      };

      if (dataInicio) params.dataInicio = dataInicio;
      if (dataFim) params.dataFim = dataFim;

      const response = await this.client.get<AdvApiPublicacoesResponse>('/api/publicacoes', { params });
      return response.data;
    } catch (error) {
      appLogger.error('ADVAPI: Erro ao listar publicações', error as Error, {
        advogadoOab,
        ufOab,
      });

      return {
        success: false,
        publicacoes: [],
        total: 0,
        page: 1,
        pageSize,
        totalPages: 0,
      };
    }
  }

  /**
   * Buscar publicação específica por ID
   */
  async buscarPublicacao(publicacaoId: string): Promise<AdvApiPublicacao | null> {
    try {
      const response = await this.client.get<AdvApiPublicacao>(`/api/publicacoes/${publicacaoId}`);
      return response.data;
    } catch (error) {
      appLogger.error('ADVAPI: Erro ao buscar publicação', error as Error, {
        publicacaoId,
      });
      return null;
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

// Singleton para uso global (se API key for configurada via env)
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
