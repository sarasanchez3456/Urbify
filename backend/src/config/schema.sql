-- Fuerza la codificación de la conexión: el cliente `mysql` del
-- docker-entrypoint-initdb.d se conecta con latin1 por defecto y, sin esto,
-- las tildes de los datos semilla se guardan doblemente codificadas (mojibake).
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS urbify_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

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
  rol           VARCHAR(20) NOT NULL,
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
  CONSTRAINT chk_usuarios_rol CHECK (rol IN ('cliente', 'proveedor', 'admin')),
  FOREIGN KEY (categoria_id) REFERENCES categorias(id),
  INDEX idx_usuarios_geo (latitud, longitud),
  INDEX idx_usuarios_rol_activo (rol, activo)
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
  FOREIGN KEY (categoria_id) REFERENCES categorias(id),
  INDEX idx_servicios_categoria (categoria_id, disponible),
  INDEX idx_servicios_proveedor (proveedor_id)
);

CREATE TABLE IF NOT EXISTS solicitudes (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id       INT NOT NULL,
  proveedor_id     INT NOT NULL,
  servicio_id      INT NOT NULL,
  descripcion      TEXT,
  tarifa_acordada  DECIMAL(10,2),
  tipo_tarifa_acordada VARCHAR(20),
  direccion        VARCHAR(255),
  latitud          DECIMAL(10,8),
  longitud         DECIMAL(11,8),
  fecha_solicitud  DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_servicio   DATETIME,
  estado           VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptada', 'en_proceso', 'completada', 'cancelada')),
  correo_enviado   BOOLEAN DEFAULT 0,
  FOREIGN KEY (cliente_id)   REFERENCES usuarios(id),
  FOREIGN KEY (proveedor_id) REFERENCES usuarios(id),
  FOREIGN KEY (servicio_id)  REFERENCES servicios(id),
  INDEX idx_solicitudes_cliente (cliente_id),
  INDEX idx_solicitudes_proveedor (proveedor_id)
);

CREATE TABLE IF NOT EXISTS mensajes_solicitud (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  solicitud_id    INT NOT NULL,
  remitente_id    INT NOT NULL,
  contenido       VARCHAR(1000) NOT NULL,
  fecha_envio     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  leido           BOOLEAN NOT NULL DEFAULT 0,
  FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE,
  FOREIGN KEY (remitente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_mensajes_solicitud_fecha (solicitud_id, fecha_envio)
);

CREATE TABLE IF NOT EXISTS calificaciones (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  solicitud_id     INT NOT NULL UNIQUE,
  cliente_id       INT NOT NULL,
  proveedor_id     INT NOT NULL,
  puntuacion       TINYINT NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
  comentario       TEXT,
  motivos          VARCHAR(120) NULL,
  oculta           BOOLEAN NOT NULL DEFAULT 0,
  fecha_creacion        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (solicitud_id)  REFERENCES solicitudes(id),
  FOREIGN KEY (cliente_id)    REFERENCES usuarios(id),
  FOREIGN KEY (proveedor_id)  REFERENCES usuarios(id),
  INDEX idx_calificaciones_proveedor (proveedor_id)
);

-- Registro de lo que hacen los administradores: quién, qué, sobre qué y por qué. Solo se agrega, nunca se edita.
CREATE TABLE IF NOT EXISTS auditoria (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  admin_id    INT NULL,
  tipo        VARCHAR(20) NOT NULL,
  accion      VARCHAR(120) NOT NULL,
  objeto      VARCHAR(200) NOT NULL DEFAULT '',
  motivo      VARCHAR(300) NULL,
  fecha       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_auditoria_fecha (fecha),
  INDEX idx_auditoria_tipo (tipo, fecha)
);

-- Horario semanal en el que cada proveedor atiende (hora de Colombia). dia_semana: 0 = domingo ... 6 = sábado.
-- Sin filas, el proveedor no ha configurado su horario (se ofrece un horario por defecto, ver utils/agenda.js).
CREATE TABLE IF NOT EXISTS disponibilidad_proveedor (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  proveedor_id   INT NOT NULL,
  dia_semana     TINYINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio    TIME NOT NULL,
  hora_fin       TIME NOT NULL,
  FOREIGN KEY (proveedor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_disponibilidad_proveedor (proveedor_id, dia_semana)
);

-- Pedidos de cambio de fecha de una solicitud ya aceptada. El profesional los acepta o rechaza; mientras estén
-- pendientes, la fecha propuesta queda reservada para que otro cliente no la elija.
CREATE TABLE IF NOT EXISTS reprogramaciones (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  solicitud_id     INT NOT NULL,
  solicitado_por   INT NOT NULL,
  fecha_actual     DATETIME NOT NULL,
  fecha_propuesta  DATETIME NOT NULL,
  estado           VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptada', 'rechazada', 'cancelada')),
  fecha_creacion   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_respuesta  DATETIME NULL,
  FOREIGN KEY (solicitud_id)   REFERENCES solicitudes(id) ON DELETE CASCADE,
  FOREIGN KEY (solicitado_por) REFERENCES usuarios(id),
  INDEX idx_reprogramaciones_solicitud (solicitud_id, estado),
  INDEX idx_reprogramaciones_propuesta (estado, fecha_propuesta)
);

-- Historial de estados de cada solicitud: una fila por cambio (cuándo se creó, se aceptó, se inició...).
-- estado_anterior es NULL en la fila de creación. Se borra junto con la solicitud.
CREATE TABLE IF NOT EXISTS solicitud_historial (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  solicitud_id     INT NOT NULL,
  estado_anterior  VARCHAR(20) NULL,
  estado_nuevo     VARCHAR(20) NOT NULL,
  usuario_id       INT NULL,
  fecha            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE,
  INDEX idx_historial_solicitud (solicitud_id, fecha)
);

CREATE TABLE IF NOT EXISTS tokens_sesion (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id       INT NOT NULL,
  token            VARCHAR(512) NOT NULL,
  expira_en        DATETIME NOT NULL,
  fecha_creacion        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_tokens_sesion_token (usuario_id, expira_en)
);

-- Códigos de recuperación de contraseña: solo se guarda el hash, vencen y son de un solo uso.
CREATE TABLE IF NOT EXISTS recuperaciones_contrasena (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id       INT NOT NULL,
  codigo_hash      VARCHAR(255) NOT NULL,
  expira_en        DATETIME NOT NULL,
  intentos         INT NOT NULL DEFAULT 0,
  usado            BOOLEAN NOT NULL DEFAULT 0,
  fecha_creacion   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_recuperaciones_usuario (usuario_id, expira_en)
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id       INT NOT NULL,
  mensaje          TEXT NOT NULL,
  leida            BOOLEAN DEFAULT 0,
  fecha_creacion        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
