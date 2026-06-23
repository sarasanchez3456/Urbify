CREATE DATABASE IF NOT EXISTS urbify_db;

USE urbify_db;

CREATE TABLE IF NOT EXISTS categorias (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  icono_url     VARCHAR(255),
  descripcion   TEXT
);

INSERT IGNORE INTO categorias (id, nombre, descripcion) VALUES
  (1, 'Electricidad',  'Instalaciones eléctricas, reparaciones y mantenimiento'),
  (2, 'Plomería',      'Reparación de tuberías, sanitarios y sistemas de agua'),
  (3, 'Mecánica',      'Reparación y mantenimiento de vehículos'),
  (4, 'Carpintería',   'Fabricación y reparación de muebles y estructuras en madera'),
  (5, 'Pintura',       'Pintura interior y exterior de inmuebles'),
  (6, 'Cerrajería',    'Instalación y reparación de cerraduras'),
  (7, 'Jardinería',    'Mantenimiento de jardines y zonas verdes'),
  (8, 'Limpieza',      'Servicios de aseo residencial y comercial');

CREATE TABLE IF NOT EXISTS usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  apellido      VARCHAR(100) NOT NULL,
  correo        VARCHAR(150) NOT NULL UNIQUE,
  contrasena    VARCHAR(255) NOT NULL,
  telefono      VARCHAR(20),
  rol           VARCHAR(20) NOT NULL CHECK (rol IN ('cliente', 'proveedor')),
  foto_url      VARCHAR(255),
  categoria_id  INT NULL,
  latitud       DECIMAL(10,8),
  longitud      DECIMAL(11,8),
  oficio        VARCHAR(100),
  direccion     VARCHAR(255),
  activo        BOOLEAN DEFAULT 1,
  intentos_fallidos INT DEFAULT 0,
  bloqueado_hasta   DATETIME NULL,
  fecha_creacion     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

CREATE TABLE IF NOT EXISTS servicios (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  proveedor_id     INT NOT NULL,
  categoria_id     INT NOT NULL,
  titulo           VARCHAR(150) NOT NULL,
  descripcion      TEXT,
  tarifa           DECIMAL(10,2) NOT NULL,
  tipo_tarifa      VARCHAR(10) DEFAULT 'hora' CHECK (tipo_tarifa IN ('hora', 'fijo')),
  disponible       BOOLEAN DEFAULT 1,
  fecha_creacion       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proveedor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

CREATE TABLE IF NOT EXISTS solicitudes (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id       INT NOT NULL,
  proveedor_id     INT NOT NULL,
  servicio_id      INT NOT NULL,
  descripcion      TEXT,
  direccion        VARCHAR(255),
  latitud          DECIMAL(10,8),
  longitud         DECIMAL(11,8),
  fecha_solicitud  DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_servicio   DATETIME,
  estado           VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptada', 'en_proceso', 'completada', 'cancelada')),
  correo_enviado   BOOLEAN DEFAULT 0,
  FOREIGN KEY (cliente_id)   REFERENCES usuarios(id),
  FOREIGN KEY (proveedor_id) REFERENCES usuarios(id),
  FOREIGN KEY (servicio_id)  REFERENCES servicios(id)
);

CREATE TABLE IF NOT EXISTS calificaciones (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  solicitud_id     INT NOT NULL UNIQUE,
  cliente_id       INT NOT NULL,
  proveedor_id     INT NOT NULL,
  puntuacion       TINYINT NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
  comentario       TEXT,
  fecha_creacion        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (solicitud_id)  REFERENCES solicitudes(id),
  FOREIGN KEY (cliente_id)    REFERENCES usuarios(id),
  FOREIGN KEY (proveedor_id)  REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS tokens_sesion (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id       INT NOT NULL,
  token            VARCHAR(512) NOT NULL,
  expira_en        DATETIME NOT NULL,
  fecha_creacion        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id       INT NOT NULL,
  mensaje          TEXT NOT NULL,
  leida            BOOLEAN DEFAULT 0,
  fecha_creacion        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
