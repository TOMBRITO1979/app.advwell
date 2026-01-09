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

// PNJ Types
export interface PortalPNJ {
  id: string;
  number: string;
  protocol: string | null;
  title: string;
  description: string | null;
  status: 'ACTIVE' | 'ARCHIVED' | 'FINISHED';
  openDate: string;
  closeDate: string | null;
  createdAt: string;
  updatedAt: string;
  lastMovement: {
    id: string;
    description: string;
    date: string;
  } | null;
}

export interface PortalPNJDetails extends Omit<PortalPNJ, 'lastMovement'> {
  parts: {
    id: string;
    type: 'PARTE_CONTRARIA' | 'INTERESSADO' | 'TESTEMUNHA' | 'OUTRO';
    name: string;
    document: string | null;
  }[];
}

export interface PortalPNJMovement {
  id: string;
  description: string;
  date: string;
  notes: string | null;
  createdAt: string;
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

// Message Types
export interface PortalMessage {
  id: string;
  sender: 'CLIENT' | 'OFFICE';
  subject: string | null;
  content: string;
  readAt: string | null;
  createdAt: string;
  creator?: {
    id: string;
    name: string;
  };
  replies?: PortalMessage[];
}

// Document Types
export interface PortalDocument {
  id: string;
  name: string;
  description: string | null;
  fileUrl: string;
  fileKey: string;
  fileSize: number;
  fileType: string;
  sharedAt: string;
  requiresSignature: boolean;
  allowDownload: boolean;
  status: 'PENDING' | 'VIEWED' | 'DOWNLOADED' | 'SIGNED' | 'UPLOADED';
  signedAt: string | null;
  signatureUrl: string | null;
  viewedAt: string | null;
  downloadedAt: string | null;
  uploadedByClient: boolean;
  uploadedAt: string | null;
  sharedBy: {
    name: string;
  };
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

  // PNJ endpoints
  getPNJs: async (): Promise<PortalPNJ[]> => {
    const response = await api.get('/portal/pnjs');
    return response.data;
  },

  getPNJDetails: async (id: string): Promise<PortalPNJDetails> => {
    const response = await api.get(`/portal/pnjs/${id}`);
    return response.data;
  },

  getPNJMovements: async (id: string): Promise<PortalPNJMovement[]> => {
    const response = await api.get(`/portal/pnjs/${id}/movements`);
    return response.data;
  },

  // Document endpoints
  getDocuments: async (): Promise<PortalDocument[]> => {
    const response = await api.get('/portal/documents');
    return response.data;
  },

  getDocumentDetails: async (id: string): Promise<PortalDocument> => {
    const response = await api.get(`/portal/documents/${id}`);
    return response.data;
  },

  downloadDocument: async (id: string): Promise<{ downloadUrl: string }> => {
    const response = await api.post(`/portal/documents/${id}/download`);
    return response.data;
  },

  signDocument: async (id: string, signatureImage: string): Promise<{ message: string; signedAt: string }> => {
    const response = await api.post(`/portal/documents/${id}/sign`, { signatureImage });
    return response.data;
  },

  uploadDocument: async (file: File, name: string, description?: string): Promise<PortalDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    if (description) formData.append('description', description);

    const response = await api.post('/portal/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Message endpoints
  getMessages: async (): Promise<PortalMessage[]> => {
    const response = await api.get('/client-messages/client');
    return response.data;
  },

  sendMessage: async (subject: string | null, content: string, parentId?: string): Promise<PortalMessage> => {
    const response = await api.post('/client-messages/client', { subject, content, parentId });
    return response.data;
  },
};

export default portalApi;
