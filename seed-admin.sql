-- Insert admin user
-- Password: admin123 (hashed with bcryptjs 10 rounds)
INSERT INTO users (username, email, password_hash, role) VALUES 
('admin', 'admin@logbook.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36Z5SrUm', 'admin');
