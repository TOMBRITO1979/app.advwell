/**
 * Authentication Tests
 * Tests auth-related functionality
 */

import request from 'supertest';
import express from 'express';

// Create a minimal express app for testing auth validation
const app = express();
app.use(express.json());

// Mock login endpoint for testing validation
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required'
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Invalid email format'
    });
  }

  // Validate password length
  if (password.length < 6) {
    return res.status(400).json({
      error: 'Password must be at least 6 characters'
    });
  }

  // Mock successful login
  res.json({
    success: true,
    token: 'mock-jwt-token',
    user: {
      id: '1',
      email: email,
      role: 'USER'
    }
  });
});

// Mock protected endpoint
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  res.json({
    id: '1',
    email: 'test@example.com',
    role: 'USER'
  });
});

describe('Authentication - Login', () => {
  describe('POST /api/auth/login', () => {
    it('should reject login without email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should reject login without password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should reject login with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('email');
    });

    it('should reject login with short password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: '123'
        });

      expect(response.status).toBe(400);
    });

    it('should return token on valid login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
    });
  });
});

describe('Authentication - Protected Routes', () => {
  describe('GET /api/auth/me', () => {
    it('should reject request without auth header', async () => {
      const response = await request(app).get('/api/auth/me');
      expect(response.status).toBe(401);
    });

    it('should reject request with invalid auth format', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat token123');

      expect(response.status).toBe(401);
    });

    it('should accept request with valid Bearer token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.email).toBeDefined();
    });
  });
});

describe('Input Validation', () => {
  it('should handle empty request body', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(response.status).toBe(400);
  });

  it('should handle malformed JSON gracefully', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ invalid json }');

    // Express should return 400 for malformed JSON (parsing error)
    expect(response.status).toBe(400);
  });
});
