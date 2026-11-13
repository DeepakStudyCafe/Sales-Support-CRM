-- ============================================================
-- Migration 004: Super Admin User Seed
-- Password: Admin@123 (bcrypt hash, rounds=12)
-- CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN
-- ============================================================

DECLARE @superAdminRoleId UNIQUEIDENTIFIER;
SELECT @superAdminRoleId = id FROM roles WHERE name = 'Super Admin';

IF @superAdminRoleId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@crm.com')
BEGIN
  INSERT INTO users (
    email, phone, password_hash, first_name, last_name,
    role_id, is_active, timezone
  ) VALUES (
    'admin@crm.com',
    '+919999999999',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj.i2TLfBz5i',
    'Super',
    'Admin',
    @superAdminRoleId,
    1,
    'Asia/Kolkata'
  );
  PRINT 'Super Admin user created: admin@crm.com / Admin@123';
END
ELSE
BEGIN
  PRINT 'Super Admin user already exists or role not found';
END

