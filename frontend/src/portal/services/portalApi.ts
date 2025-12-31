import api from '../../services/api';

// Types
export interface PortalProfile {
  id: string;
  name: string;
  personType: 'FISICA' | 'JURIDICA';
  cpf: string | null;
  rg: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  profession: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  birthDate: string | null;
  stateRegistration: string | null;
  representativeName: string | null;
  representativeCpf: string | null;
  createdAt: string;
}

export interface PortalCompany {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  logo: string | null;
}

export interface PortalCase {
  id: string;
  processNumber: string;
  court: string;
  subject: string;
  status: 'PENDENTE' | 'ACTIVE' | 'ARCHIVED' | 'FINISHED';
  deadline: string | null;
  ultimoAndamento: string | null;
  informarCliente: string | null;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string | null;
  lastMovement: {
    id: string;
    movementName: string;
    movementDate: string;
  } | null;
}

export interface PortalCaseDetails extends Omit<PortalCase, 'lastMovement'> {
  value: string | null;
  deadlineCompleted: boolean;
  linkProcesso: string | null;
  aiSummary: string | null;
  parts: {
    id: string;
    type: 'AUTOR' | 'REU' | 'REPRESENTANTE_LEGAL';
    name: string;
    cpfCnpj: string | null;
  }[];
}

export interface PortalMovement {
  id: string;
  movementCode: number;
  movementName: string;
  movementDate: string;
  description: string | null;
  createdAt: string;
}

export interface PortalAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  publishedAt: string;
  creator: {
    name: string;
  };
}

export interface PortalDashboardStats {
  totalCases: number;
  activeCases: number;
  pendingCases: number;
  finishedCases: number;
  activeAnnouncements: number;
}

export interface PortalDashboard {
  stats: PortalDashboardStats;
  recentMovements: {
    id: string;
    movementName: string;
    movementDate: string;
    processNumber: string;
  }[];
}

// API calls
export const portalApi = {
  getDashboard: async (): Promise<PortalDashboard> => {
    const response = await api.get('/portal/dashboard');
    return response.data;
  },

  getProfile: async (): Promise<PortalProfile> => {
    const response = await api.get('/portal/profile');
    return response.data;
  },

  getCompany: async (): Promise<PortalCompany> => {
    const response = await api.get('/portal/company');
    return response.data;
  },

  getCases: async (): Promise<PortalCase[]> => {
    const response = await api.get('/portal/cases');
    return response.data;
  },

  getCaseDetails: async (id: string): Promise<PortalCaseDetails> => {
    const response = await api.get(`/portal/cases/${id}`);
    return response.data;
  },

  getCaseMovements: async (id: string): Promise<PortalMovement[]> => {
    const response = await api.get(`/portal/cases/${id}/movements`);
    return response.data;
  },

  getAnnouncements: async (): Promise<PortalAnnouncement[]> => {
    const response = await api.get('/portal/announcements');
    return response.data;
  },
};

export default portalApi;
