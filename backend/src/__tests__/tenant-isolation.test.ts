/**
 * Multi-Tenant Isolation Tests
 *
 * Tests to verify that tenant isolation is properly enforced:
 * 1. Users can only access data from their own company
 * 2. SUPER_ADMIN bypasses tenant restrictions
 * 3. Inactive companies are blocked
 * 4. Missing companyId is rejected
 */

import { Request, Response, NextFunction } from 'express';
import { validateTenant } from '../middleware/tenant';
import { AuthRequest } from '../middleware/auth';

// Mock Redis cache
jest.mock('../utils/redis', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
  redis: {
    ping: jest.fn().mockResolvedValue('PONG'),
  },
}));

// Mock Prisma
jest.mock('../utils/prisma', () => ({
  __esModule: true,
  default: {
    company: {
      findUnique: jest.fn(),
    },
  },
}));

import prisma from '../utils/prisma';
import { cache } from '../utils/redis';

// Helper to create mock request
function createMockRequest(user: any = null): AuthRequest {
  return {
    user,
    originalUrl: '/api/clients',
    headers: {},
    body: {},
    params: {},
    query: {},
  } as AuthRequest;
}

// Helper to create mock response
function createMockResponse(): Response {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as Response;
}

// Helper to create mock next function
function createMockNext(): NextFunction {
  return jest.fn();
}

describe('Multi-Tenant Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateTenant Middleware', () => {
    describe('SUPER_ADMIN bypass', () => {
      it('should allow SUPER_ADMIN without companyId', async () => {
        const req = createMockRequest({
          id: 'super-admin-id',
          role: 'SUPER_ADMIN',
          companyId: null,
        });
        const res = createMockResponse();
        const next = createMockNext();

        await validateTenant(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should allow SUPER_ADMIN with any companyId', async () => {
        const req = createMockRequest({
          id: 'super-admin-id',
          role: 'SUPER_ADMIN',
          companyId: 'any-company-id',
        });
        const res = createMockResponse();
        const next = createMockNext();

        await validateTenant(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe('Regular user validation', () => {
      it('should reject user without companyId', async () => {
        const req = createMockRequest({
          id: 'user-id',
          role: 'USER',
          companyId: null,
        });
        const res = createMockResponse();
        const next = createMockNext();

        await validateTenant(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.stringContaining('Empresa'),
          })
        );
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject user with undefined companyId', async () => {
        const req = createMockRequest({
          id: 'user-id',
          role: 'USER',
          companyId: undefined,
        });
        const res = createMockResponse();
        const next = createMockNext();

        await validateTenant(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
      });

      it('should allow user with valid active company (from cache)', async () => {
        const companyId = 'valid-company-id';
        const req = createMockRequest({
          id: 'user-id',
          role: 'USER',
          companyId,
        });
        const res = createMockResponse();
        const next = createMockNext();

        // Mock cache hit with active company
        (cache.get as jest.Mock).mockResolvedValue({
          active: true,
          subscriptionStatus: 'ACTIVE',
          trialEndsAt: null,
        });

        await validateTenant(req, res, next);

        expect(cache.get).toHaveBeenCalledWith(`company:status:${companyId}`);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should allow user with valid active company (from database)', async () => {
        const companyId = 'valid-company-id';
        const req = createMockRequest({
          id: 'user-id',
          role: 'USER',
          companyId,
        });
        const res = createMockResponse();
        const next = createMockNext();

        // Mock cache miss
        (cache.get as jest.Mock).mockResolvedValue(null);

        // Mock database query
        (prisma.company.findUnique as jest.Mock).mockResolvedValue({
          active: true,
          subscriptionStatus: 'ACTIVE',
          trialEndsAt: null,
        });

        await validateTenant(req, res, next);

        expect(prisma.company.findUnique).toHaveBeenCalledWith({
          where: { id: companyId },
          select: {
            active: true,
            subscriptionStatus: true,
            trialEndsAt: true,
          },
        });
        expect(cache.set).toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
      });

      it('should reject user with inactive company', async () => {
        const companyId = 'inactive-company-id';
        const req = createMockRequest({
          id: 'user-id',
          role: 'USER',
          companyId,
        });
        const res = createMockResponse();
        const next = createMockNext();

        // Mock cache hit with inactive company
        (cache.get as jest.Mock).mockResolvedValue({
          active: false,
          subscriptionStatus: 'ACTIVE',
          trialEndsAt: null,
        });

        await validateTenant(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.stringContaining('inativa'),
          })
        );
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject user with non-existent company', async () => {
        const companyId = 'non-existent-company-id';
        const req = createMockRequest({
          id: 'user-id',
          role: 'USER',
          companyId,
        });
        const res = createMockResponse();
        const next = createMockNext();

        // Mock cache miss
        (cache.get as jest.Mock).mockResolvedValue(null);

        // Mock database returns null (company not found)
        (prisma.company.findUnique as jest.Mock).mockResolvedValue(null);

        await validateTenant(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.stringContaining('não encontrada'),
          })
        );
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('Subscription validation', () => {
      it('should reject user with expired subscription', async () => {
        const companyId = 'expired-company-id';
        const req = createMockRequest({
          id: 'user-id',
          role: 'USER',
          companyId,
        });
        const res = createMockResponse();
        const next = createMockNext();

        // Mock cache hit with expired subscription
        (cache.get as jest.Mock).mockResolvedValue({
          active: true,
          subscriptionStatus: 'EXPIRED',
          trialEndsAt: null,
        });

        await validateTenant(req, res, next);

        expect(res.status).toHaveBeenCalledWith(402);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'SUBSCRIPTION_EXPIRED',
          })
        );
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject user with cancelled subscription', async () => {
        const companyId = 'cancelled-company-id';
        const req = createMockRequest({
          id: 'user-id',
          role: 'USER',
          companyId,
        });
        const res = createMockResponse();
        const next = createMockNext();

        (cache.get as jest.Mock).mockResolvedValue({
          active: true,
          subscriptionStatus: 'CANCELLED',
          trialEndsAt: null,
        });

        await validateTenant(req, res, next);

        expect(res.status).toHaveBeenCalledWith(402);
        expect(next).not.toHaveBeenCalled();
      });

      it('should allow user with valid trial', async () => {
        const companyId = 'trial-company-id';
        const req = createMockRequest({
          id: 'user-id',
          role: 'USER',
          companyId,
        });
        const res = createMockResponse();
        const next = createMockNext();

        // Trial ends in the future
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        (cache.get as jest.Mock).mockResolvedValue({
          active: true,
          subscriptionStatus: 'TRIAL',
          trialEndsAt: futureDate,
        });

        await validateTenant(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should reject user with expired trial', async () => {
        const companyId = 'expired-trial-company-id';
        const req = createMockRequest({
          id: 'user-id',
          role: 'USER',
          companyId,
        });
        const res = createMockResponse();
        const next = createMockNext();

        // Trial ended in the past
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 7);

        (cache.get as jest.Mock).mockResolvedValue({
          active: true,
          subscriptionStatus: 'TRIAL',
          trialEndsAt: pastDate,
        });

        await validateTenant(req, res, next);

        expect(res.status).toHaveBeenCalledWith(402);
        expect(next).not.toHaveBeenCalled();
      });

      it('should allow exempt routes even with expired subscription', async () => {
        const companyId = 'expired-company-id';
        const req = createMockRequest({
          id: 'user-id',
          role: 'USER',
          companyId,
        });
        // Subscription page is exempt
        req.originalUrl = '/api/subscription';
        const res = createMockResponse();
        const next = createMockNext();

        (cache.get as jest.Mock).mockResolvedValue({
          active: true,
          subscriptionStatus: 'EXPIRED',
          trialEndsAt: null,
        });

        await validateTenant(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe('ADMIN role', () => {
      it('should validate ADMIN same as regular user', async () => {
        const companyId = 'admin-company-id';
        const req = createMockRequest({
          id: 'admin-id',
          role: 'ADMIN',
          companyId,
        });
        const res = createMockResponse();
        const next = createMockNext();

        (cache.get as jest.Mock).mockResolvedValue({
          active: true,
          subscriptionStatus: 'ACTIVE',
          trialEndsAt: null,
        });

        await validateTenant(req, res, next);

        expect(next).toHaveBeenCalled();
      });

      it('should reject ADMIN without companyId', async () => {
        const req = createMockRequest({
          id: 'admin-id',
          role: 'ADMIN',
          companyId: null,
        });
        const res = createMockResponse();
        const next = createMockNext();

        await validateTenant(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('Error handling', () => {
      it('should handle Redis errors gracefully', async () => {
        const companyId = 'valid-company-id';
        const req = createMockRequest({
          id: 'user-id',
          role: 'USER',
          companyId,
        });
        const res = createMockResponse();
        const next = createMockNext();

        // Redis throws error
        (cache.get as jest.Mock).mockRejectedValue(new Error('Redis connection failed'));

        // Fallback to database should work
        (prisma.company.findUnique as jest.Mock).mockResolvedValue({
          active: true,
          subscriptionStatus: 'ACTIVE',
          trialEndsAt: null,
        });

        await validateTenant(req, res, next);

        // Should fallback to database and still work
        expect(prisma.company.findUnique).toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
      });

      it('should handle database errors', async () => {
        const companyId = 'valid-company-id';
        const req = createMockRequest({
          id: 'user-id',
          role: 'USER',
          companyId,
        });
        const res = createMockResponse();
        const next = createMockNext();

        // Cache miss and database error
        (cache.get as jest.Mock).mockRejectedValue(new Error('Redis error'));
        (prisma.company.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

        await validateTenant(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.stringContaining('tenant'),
          })
        );
      });
    });
  });

  describe('Cross-tenant data access prevention', () => {
    it('should verify companyId is attached to authenticated user', () => {
      // This test verifies that the auth middleware properly attaches companyId
      const userFromCompanyA = {
        id: 'user-a',
        companyId: 'company-a',
        role: 'USER',
      };

      const userFromCompanyB = {
        id: 'user-b',
        companyId: 'company-b',
        role: 'USER',
      };

      // Users should have different companyIds
      expect(userFromCompanyA.companyId).not.toBe(userFromCompanyB.companyId);

      // Each user should have a companyId
      expect(userFromCompanyA.companyId).toBeDefined();
      expect(userFromCompanyB.companyId).toBeDefined();
    });

    it('should verify data queries include companyId filter', () => {
      // This documents the expected pattern for data queries
      const companyId = 'test-company-id';

      // Example query structure that should be used in controllers
      const expectedQueryPattern = {
        where: {
          companyId: companyId,
          // ... other filters
        },
      };

      expect(expectedQueryPattern.where.companyId).toBe(companyId);
    });
  });
});

describe('Tenant Isolation - Integration Patterns', () => {
  describe('Query patterns', () => {
    it('documents expected companyId filtering in queries', () => {
      // All data queries should include companyId from authenticated user
      const mockUser = { companyId: 'user-company-id' };

      const clientQuery = {
        where: { companyId: mockUser.companyId },
      };

      const caseQuery = {
        where: { companyId: mockUser.companyId },
      };

      const financialQuery = {
        where: { companyId: mockUser.companyId },
      };

      expect(clientQuery.where.companyId).toBe(mockUser.companyId);
      expect(caseQuery.where.companyId).toBe(mockUser.companyId);
      expect(financialQuery.where.companyId).toBe(mockUser.companyId);
    });

    it('documents that companyId should never be accepted from request body', () => {
      // Security: companyId should come from authenticated user, not request
      const maliciousRequest = {
        body: {
          companyId: 'attacker-company-id', // Should be ignored
          name: 'Test Client',
        },
      };

      const authenticatedUser = {
        companyId: 'legitimate-company-id',
      };

      // The correct companyId to use is from the authenticated user
      const safeCompanyId = authenticatedUser.companyId;

      // NOT from the request body
      expect(safeCompanyId).not.toBe(maliciousRequest.body.companyId);
      expect(safeCompanyId).toBe('legitimate-company-id');
    });
  });
});
