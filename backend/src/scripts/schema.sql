CREATE DATABASE IF NOT EXISTS urbify_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE urbify_db;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  correo VARCHAR(255) NOT NULL UNIQUE,
  contrasena VARCHAR(255) NOT NULL,
  telefono VARCHAR(20) NULL,
  rol ENUM('cliente', 'proveedor') NOT NULL,
  foto_url VARCHAR(500) NULL,
  direccion VARCHAR(500) NULL,
  latitud DECIMAL(10, 8) NULL,
  longitud DECIMAL(11, 8) NULL,
  oficio VARCHAR(100) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  intentos_fallidos INT NOT NULL DEFAULT 0,
  bloqueado_hasta DATETIME NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tokens_sesion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  token TEXT NOT NULL,
  expira_en DATETIME NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion VARCHAR(500) NULL,
  icono_url VARCHAR(500) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS servicios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proveedor_id INT NOT NULL,
  categoria_id INT NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT NULL,
  tarifa DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tipo_tarifa VARCHAR(20) NOT NULL DEFAULT 'hora',
  disponible TINYINT(1) NOT NULL DEFAULT 1,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proveedor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS solicitudes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  proveedor_id INT NOT NULL,
  servicio_id INT NOT NULL,
  descripcion TEXT NULL,
  fecha_servicio DATETIME NULL,
  direccion VARCHAR(500) NULL,
  latitud DECIMAL(10, 8) NULL,
  longitud DECIMAL(11, 8) NULL,
  estado ENUM('pendiente', 'aceptada', 'en_proceso', 'completada', 'cancelada') NOT NULL DEFAULT 'pendiente',
  correo_enviado TINYINT(1) NOT NULL DEFAULT 0,
  fecha_solicitud DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES usuarios(id),
  FOREIGN KEY (proveedor_id) REFERENCES usuarios(id),
  FOREIGN KEY (servicio_id) REFERENCES servicios(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS calificaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  solicitud_id INT NOT NULL UNIQUE,
  cliente_id INT NOT NULL,
  proveedor_id INT NOT NULL,
  puntuacion INT NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
  comentario TEXT NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id),
  FOREIGN KEY (cliente_id) REFERENCES usuarios(id),
  FOREIGN KEY (proveedor_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notificaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  mensaje TEXT NOT NULL,
  leida TINYINT(1) NOT NULL DEFAULT 0,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Índices para optimizar búsquedas por proximidad y consultas frecuentes
CREATE INDEX idx_usuarios_geo ON usuarios (latitud, longitud);
CREATE INDEX idx_usuarios_rol_activo ON usuarios (rol, activo);
CREATE INDEX idx_servicios_categoria ON servicios (categoria_id, disponible);
CREATE INDEX idx_servicios_proveedor ON servicios (proveedor_id);
CREATE INDEX idx_solicitudes_cliente ON solicitudes (cliente_id);
CREATE INDEX idx_solicitudes_proveedor ON solicitudes (proveedor_id);
CREATE INDEX idx_calificaciones_proveedor ON calificaciones (proveedor_id);
CREATE INDEX idx_tokens_sesion_token ON tokens_sesion (usuario_id, expira_en);
