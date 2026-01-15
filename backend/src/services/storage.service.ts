import prisma from '../utils/prisma';
import { appLogger } from '../utils/logger';
import Redis from 'ioredis';

// Cache TTL in seconds (10 minutes - storage changes infrequently)
const STORAGE_CACHE_TTL = 600;

// Get Redis client (lazy)
let redisClient: Redis | null = null;
function getRedis(): Redis | null {
  if (!redisClient && process.env.REDIS_HOST) {
    try {
      redisClient = new Redis({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      });
    } catch (error) {
      appLogger.warn('Redis not available for storage cache');
    }
  }
  return redisClient;
}

export interface StorageMetrics {
  companyId: string;
  companyName: string;
  storageUsedBytes: bigint;
  storageUsedFormatted: string;
  storageLimitBytes: bigint;
  storageLimitFormatted: string;
  storageUsedPercent: number;
  isOverLimit: boolean;
  fileCount: {
    documents: number;
    caseDocuments: number;
    sharedDocuments: number;
    pnjDocuments: number;
    total: number;
  };
  storageByType: {
    documents: bigint;
    caseDocuments: bigint;
    sharedDocuments: bigint;
    pnjDocuments: bigint;
  };
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: bigint | number): string {
  const b = typeof bytes === 'bigint' ? Number(bytes) : bytes;

  if (b === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));

  return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Calculate storage used by a company across all document tables
 */
export async function calculateCompanyStorageUsed(companyId: string): Promise<{
  totalBytes: bigint;
  fileCount: StorageMetrics['fileCount'];
  storageByType: StorageMetrics['storageByType'];
}> {
  // Query all document tables in parallel
  const [documents, caseDocuments, sharedDocuments, pnjDocuments] = await Promise.all([
    // Documents table
    prisma.document.aggregate({
      where: { companyId },
      _sum: { fileSize: true },
      _count: true,
    }),
    // CaseDocuments table
    prisma.caseDocument.aggregate({
      where: { companyId },
      _sum: { fileSize: true },
      _count: true,
    }),
    // SharedDocuments table
    prisma.sharedDocument.aggregate({
      where: { companyId },
      _sum: { fileSize: true },
      _count: true,
    }),
    // PNJDocuments table
    prisma.pNJDocument.aggregate({
      where: { companyId },
      _sum: { fileSize: true },
      _count: true,
    }),
  ]);

  const documentsBytes = BigInt(documents._sum.fileSize || 0);
  const caseDocumentsBytes = BigInt(caseDocuments._sum.fileSize || 0);
  const sharedDocumentsBytes = BigInt(sharedDocuments._sum.fileSize || 0);
  const pnjDocumentsBytes = BigInt(pnjDocuments._sum.fileSize || 0);

  const totalBytes = documentsBytes + caseDocumentsBytes + sharedDocumentsBytes + pnjDocumentsBytes;

  return {
    totalBytes,
    fileCount: {
      documents: documents._count,
      caseDocuments: caseDocuments._count,
      sharedDocuments: sharedDocuments._count,
      pnjDocuments: pnjDocuments._count,
      total: documents._count + caseDocuments._count + sharedDocuments._count + pnjDocuments._count,
    },
    storageByType: {
      documents: documentsBytes,
      caseDocuments: caseDocumentsBytes,
      sharedDocuments: sharedDocumentsBytes,
      pnjDocuments: pnjDocumentsBytes,
    },
  };
}

/**
 * Get full storage metrics for a company
 */
export async function getCompanyStorageMetrics(companyId: string): Promise<StorageMetrics | null> {
  // Try cache first
  const redis = getRedis();
  const cacheKey = `storage:company:${companyId}`;

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Convert string back to bigint
        return {
          ...parsed,
          storageUsedBytes: BigInt(parsed.storageUsedBytes),
          storageLimitBytes: BigInt(parsed.storageLimitBytes),
          storageByType: {
            documents: BigInt(parsed.storageByType.documents),
            caseDocuments: BigInt(parsed.storageByType.caseDocuments),
            sharedDocuments: BigInt(parsed.storageByType.sharedDocuments),
            pnjDocuments: BigInt(parsed.storageByType.pnjDocuments),
          },
        };
      }
    } catch (error) {
      appLogger.warn('Error reading storage cache', { error });
    }
  }

  // Get company info
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      storageLimit: true,
    },
  });

  if (!company) {
    return null;
  }

  // Calculate storage used
  const { totalBytes, fileCount, storageByType } = await calculateCompanyStorageUsed(companyId);

  const storageLimitBytes = company.storageLimit;
  const storageUsedPercent = storageLimitBytes > 0n
    ? Number((totalBytes * 100n) / storageLimitBytes)
    : 0;

  const metrics: StorageMetrics = {
    companyId: company.id,
    companyName: company.name,
    storageUsedBytes: totalBytes,
    storageUsedFormatted: formatBytes(totalBytes),
    storageLimitBytes,
    storageLimitFormatted: formatBytes(storageLimitBytes),
    storageUsedPercent,
    isOverLimit: totalBytes >= storageLimitBytes,
    fileCount,
    storageByType,
  };

  // Cache the result
  if (redis) {
    try {
      // Convert bigint to string for JSON serialization
      const cacheData = {
        ...metrics,
        storageUsedBytes: metrics.storageUsedBytes.toString(),
        storageLimitBytes: metrics.storageLimitBytes.toString(),
        storageByType: {
          documents: metrics.storageByType.documents.toString(),
          caseDocuments: metrics.storageByType.caseDocuments.toString(),
          sharedDocuments: metrics.storageByType.sharedDocuments.toString(),
          pnjDocuments: metrics.storageByType.pnjDocuments.toString(),
        },
      };
      await redis.setex(cacheKey, STORAGE_CACHE_TTL, JSON.stringify(cacheData));
    } catch (error) {
      appLogger.warn('Error caching storage metrics', { error });
    }
  }

  return metrics;
}

/**
 * Get storage metrics for all companies (super-admin)
 */
export async function getAllCompaniesStorageMetrics(): Promise<{
  companies: Array<{
    companyId: string;
    companyName: string;
    storageUsedBytes: string;
    storageUsedFormatted: string;
    storageLimitBytes: string;
    storageLimitFormatted: string;
    storageUsedPercent: number;
    isOverLimit: boolean;
    fileCount: number;
  }>;
  totals: {
    totalStorageUsed: string;
    totalStorageUsedFormatted: string;
    totalFiles: number;
    companiesOverLimit: number;
  };
}> {
  // Get all active companies
  const companies = await prisma.company.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      storageLimit: true,
    },
    orderBy: { name: 'asc' },
  });

  let totalStorageUsed = 0n;
  let totalFiles = 0;
  let companiesOverLimit = 0;

  const companiesMetrics = await Promise.all(
    companies.map(async (company) => {
      const { totalBytes, fileCount } = await calculateCompanyStorageUsed(company.id);

      const storageUsedPercent = company.storageLimit > 0n
        ? Number((totalBytes * 100n) / company.storageLimit)
        : 0;

      const isOverLimit = totalBytes >= company.storageLimit;

      totalStorageUsed += totalBytes;
      totalFiles += fileCount.total;
      if (isOverLimit) companiesOverLimit++;

      return {
        companyId: company.id,
        companyName: company.name,
        storageUsedBytes: totalBytes.toString(),
        storageUsedFormatted: formatBytes(totalBytes),
        storageLimitBytes: company.storageLimit.toString(),
        storageLimitFormatted: formatBytes(company.storageLimit),
        storageUsedPercent,
        isOverLimit,
        fileCount: fileCount.total,
      };
    })
  );

  // Sort by storage used (descending)
  companiesMetrics.sort((a, b) => {
    const aBytes = BigInt(a.storageUsedBytes);
    const bBytes = BigInt(b.storageUsedBytes);
    return aBytes > bBytes ? -1 : aBytes < bBytes ? 1 : 0;
  });

  return {
    companies: companiesMetrics,
    totals: {
      totalStorageUsed: totalStorageUsed.toString(),
      totalStorageUsedFormatted: formatBytes(totalStorageUsed),
      totalFiles,
      companiesOverLimit,
    },
  };
}

/**
 * Check if company can upload file of given size
 */
export async function canUploadFile(companyId: string, fileSizeBytes: number): Promise<{
  allowed: boolean;
  currentUsage: bigint;
  limit: bigint;
  remainingBytes: bigint;
  message?: string;
}> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { storageLimit: true },
  });

  if (!company) {
    return {
      allowed: false,
      currentUsage: 0n,
      limit: 0n,
      remainingBytes: 0n,
      message: 'Empresa não encontrada',
    };
  }

  const { totalBytes } = await calculateCompanyStorageUsed(companyId);
  const newTotal = totalBytes + BigInt(fileSizeBytes);
  const limit = company.storageLimit;
  const remainingBytes = limit > totalBytes ? limit - totalBytes : 0n;

  if (newTotal > limit) {
    return {
      allowed: false,
      currentUsage: totalBytes,
      limit,
      remainingBytes,
      message: `Limite de armazenamento excedido. Usado: ${formatBytes(totalBytes)} de ${formatBytes(limit)}. Espaço restante: ${formatBytes(remainingBytes)}`,
    };
  }

  return {
    allowed: true,
    currentUsage: totalBytes,
    limit,
    remainingBytes,
  };
}

/**
 * Invalidate storage cache for a company (call after upload/delete)
 */
export async function invalidateStorageCache(companyId: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(`storage:company:${companyId}`);
    } catch (error) {
      appLogger.warn('Error invalidating storage cache', { error });
    }
  }
}
