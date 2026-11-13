import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '../utils/jwt';
import { hashPassword, comparePassword, hashToken, generateToken } from '../utils/crypto';

describe('Authentication & Crypto Utilities', () => {
  describe('JWT Operations', () => {
    const payload = {
      userId: '11111111-2222-3333-4444-555555555555',
      email: 'sales@crm.com',
      roleId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      roleName: 'Sales',
    };

    it('should generate and verify an access token', () => {
      const token = generateAccessToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = verifyAccessToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.roleName).toBe(payload.roleName);
    });

    it('should generate and verify a refresh token', () => {
      const token = generateRefreshToken(payload);
      expect(token).toBeDefined();

      const decoded = verifyRefreshToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(payload.userId);
    });

    it('should reject invalid or malformed tokens', () => {
      const decoded = verifyAccessToken('invalid.token.string');
      expect(decoded).toBeNull();
    });
  });

  describe('Password Hashing & Comparing', () => {
    it('should hash a password and verify it matches', async () => {
      const raw = 'SecurePassword@123';
      const hash = await hashPassword(raw);
      expect(hash).not.toBe(raw);
      expect(hash.startsWith('$2')).toBe(true);

      const isValid = await comparePassword(raw, hash);
      expect(isValid).toBe(true);

      const isInvalid = await comparePassword('WrongPassword@999', hash);
      expect(isInvalid).toBe(false);
    });

    it('should generate secure random tokens', () => {
      const token1 = generateToken(16);
      const token2 = generateToken(16);
      expect(token1.length).toBe(32); // 16 bytes = 32 hex chars
      expect(token1).not.toBe(token2);
    });

    it('should hash tokens deterministically with SHA-256', () => {
      const token = 'sample-refresh-token-12345';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256 = 64 hex chars
    });
  });
});

