CREATE DATABASE IF NOT EXISTS urbify_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE urbify_db;

CREATE TABLE usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  apellido      VARCHAR(100) NOT NULL,
  correo        VARCHAR(150) NOT NULL UNIQUE,
  contrasena    VARCHAR(255) NOT NULL,
  telefono      VARCHAR(20),
  rol           ENUM('cliente','proveedor') NOT NULL,
  foto_url      VARCHAR(255),
  latitud       DECIMAL(10,8),
  longitud      DECIMAL(11,8),
  direccion     VARCHAR(255),
  activo        TINYINT(1) DEFAULT 1,
  creado_en     DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categorias (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  icono_url     VARCHAR(255),
  descripcion   TEXT
);

CREATE TABLE servicios (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  proveedor_id     INT NOT NULL,
  categoria_id     INT NOT NULL,
  titulo           VARCHAR(150) NOT NULL,
  descripcion      TEXT,
  tarifa           DECIMAL(10,2) NOT NULL,
  tipo_tarifa      ENUM('hora','fijo') DEFAULT 'hora',
  disponible       TINYINT(1) DEFAULT 1,
  creado_en        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proveedor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

CREATE TABLE solicitudes (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id       INT NOT NULL,
  proveedor_id     INT NOT NULL,
  servicio_id      INT NOT NULL,
  descripcion      TEXT,
  fecha_solicitud  DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_servicio   DATETIME,
  estado           ENUM('pendiente','aceptada','en_proceso','completada','cancelada') DEFAULT 'pendiente',
  correo_enviado   TINYINT(1) DEFAULT 0,
  FOREIGN KEY (cliente_id)   REFERENCES usuarios(id),
  FOREIGN KEY (proveedor_id) REFERENCES usuarios(id),
  FOREIGN KEY (servicio_id)  REFERENCES servicios(id)
);

CREATE TABLE calificaciones (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  solicitud_id     INT NOT NULL UNIQUE,
  cliente_id       INT NOT NULL,
  proveedor_id     INT NOT NULL,
  puntuacion       TINYINT NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
  comentario       TEXT,
  creado_en        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (solicitud_id)  REFERENCES solicitudes(id),
  FOREIGN KEY (cliente_id)    REFERENCES usuarios(id),
  FOREIGN KEY (proveedor_id)  REFERENCES usuarios(id)
);

CREATE TABLE tokens_sesion (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id       INT NOT NULL,
  token            VARCHAR(512) NOT NULL,
  expira_en        DATETIME NOT NULL,
  creado_en        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE notificaciones (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id       INT NOT NULL,
  mensaje          TEXT NOT NULL,
  leida            TINYINT(1) DEFAULT 0,
  creado_en        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

INSERT INTO categorias (nombre, descripcion) VALUES
  ('Electricidad',  'Instalaciones eléctricas, reparaciones y mantenimiento'),
  ('Plomería',      'Reparación de tuberías, sanitarios y sistemas de agua'),
  ('Mecánica',      'Reparación y mantenimiento de vehículos'),
  ('Carpintería',   'Fabricación y reparación de muebles y estructuras en madera'),
  ('Pintura',       'Pintura interior y exterior de inmuebles'),
  ('Cerrajería',    'Instalación y reparación de cerraduras'),
  ('Jardinería',    'Mantenimiento de jardines y zonas verdes'),
  ('Limpieza',      'Servicios de aseo residencial y comercial');
