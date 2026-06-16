IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'urbify_db')
  CREATE DATABASE urbify_db;
GO

USE urbify_db;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[categorias]') AND type in (N'U'))
CREATE TABLE categorias (
  id            INT IDENTITY(1,1) PRIMARY KEY,
  nombre        NVARCHAR(100) NOT NULL,
  icono_url     NVARCHAR(255),
  descripcion   NVARCHAR(MAX)
);
GO

IF NOT EXISTS (SELECT 1 FROM categorias)
  INSERT INTO categorias (nombre, descripcion) VALUES
    (N'Electricidad',  N'Instalaciones eléctricas, reparaciones y mantenimiento'),
    (N'Plomería',      N'Reparación de tuberías, sanitarios y sistemas de agua'),
    (N'Mecánica',      N'Reparación y mantenimiento de vehículos'),
    (N'Carpintería',   N'Fabricación y reparación de muebles y estructuras en madera'),
    (N'Pintura',       N'Pintura interior y exterior de inmuebles'),
    (N'Cerrajería',    N'Instalación y reparación de cerraduras'),
    (N'Jardinería',    N'Mantenimiento de jardines y zonas verdes'),
    (N'Limpieza',      N'Servicios de aseo residencial y comercial');
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[usuarios]') AND type in (N'U'))
CREATE TABLE usuarios (
  id            INT IDENTITY(1,1) PRIMARY KEY,
  nombre        NVARCHAR(100) NOT NULL,
  apellido      NVARCHAR(100) NOT NULL,
  correo        NVARCHAR(150) NOT NULL,
  contrasena    NVARCHAR(255) NOT NULL,
  telefono      NVARCHAR(20),
  rol           NVARCHAR(20) NOT NULL CHECK (rol IN ('cliente', 'proveedor')),
  foto_url      NVARCHAR(255),
  categoria_id  INT NULL REFERENCES categorias(id),
  latitud       DECIMAL(10,8),
  longitud      DECIMAL(11,8),
  oficio        NVARCHAR(100),
  direccion     NVARCHAR(255),
  activo        BIT DEFAULT 1,
  intentos_fallidos INT DEFAULT 0,
  bloqueado_hasta   DATETIME2 NULL,
  creado_eldia     DATETIME2 DEFAULT GETDATE(),
  CONSTRAINT UQ_usuarios_correo UNIQUE (correo)
);
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'categoria_id')
BEGIN
  ALTER TABLE usuarios ADD categoria_id INT NULL REFERENCES categorias(id);
  PRINT 'Columna categoria_id agregada a usuarios';
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[servicios]') AND type in (N'U'))
CREATE TABLE servicios (
  id               INT IDENTITY(1,1) PRIMARY KEY,
  proveedor_id     INT NOT NULL,
  categoria_id     INT NOT NULL,
  titulo           NVARCHAR(150) NOT NULL,
  descripcion      NVARCHAR(MAX),
  tarifa           DECIMAL(10,2) NOT NULL,
  tipo_tarifa      NVARCHAR(10) DEFAULT 'hora' CHECK (tipo_tarifa IN ('hora', 'fijo')),
  disponible       BIT DEFAULT 1,
  creado_eldia       DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (proveedor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[solicitudes]') AND type in (N'U'))
CREATE TABLE solicitudes (
  id               INT IDENTITY(1,1) PRIMARY KEY,
  cliente_id       INT NOT NULL,
  proveedor_id     INT NOT NULL,
  servicio_id      INT NOT NULL,
  descripcion      NVARCHAR(MAX),
  direccion        NVARCHAR(255),
  latitud          DECIMAL(10,8),
  longitud         DECIMAL(11,8),
  fecha_solicitud  DATETIME2 DEFAULT GETDATE(),
  fecha_servicio   DATETIME2,
  estado           NVARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptada', 'en_proceso', 'completada', 'cancelada')),
  correo_enviado   BIT DEFAULT 0,
  FOREIGN KEY (cliente_id)   REFERENCES usuarios(id),
  FOREIGN KEY (proveedor_id) REFERENCES usuarios(id),
  FOREIGN KEY (servicio_id)  REFERENCES servicios(id)
);
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'solicitudes' AND COLUMN_NAME = 'direccion')
BEGIN
  ALTER TABLE solicitudes ADD direccion NVARCHAR(255) NULL;
  PRINT 'Columna direccion agregada a solicitudes';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'solicitudes' AND COLUMN_NAME = 'latitud')
BEGIN
  ALTER TABLE solicitudes ADD latitud DECIMAL(10,8) NULL;
  PRINT 'Columna latitud agregada a solicitudes';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'solicitudes' AND COLUMN_NAME = 'longitud')
BEGIN
  ALTER TABLE solicitudes ADD longitud DECIMAL(11,8) NULL;
  PRINT 'Columna longitud agregada a solicitudes';
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[calificaciones]') AND type in (N'U'))
CREATE TABLE calificaciones (
  id               INT IDENTITY(1,1) PRIMARY KEY,
  solicitud_id     INT NOT NULL,
  cliente_id       INT NOT NULL,
  proveedor_id     INT NOT NULL,
  puntuacion       TINYINT NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
  comentario       NVARCHAR(MAX),
  creado_eldia        DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (solicitud_id)  REFERENCES solicitudes(id),
  FOREIGN KEY (cliente_id)    REFERENCES usuarios(id),
  FOREIGN KEY (proveedor_id)  REFERENCES usuarios(id),
  CONSTRAINT UQ_calificaciones_solicitud UNIQUE (solicitud_id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tokens_sesion]') AND type in (N'U'))
CREATE TABLE tokens_sesion (
  id               INT IDENTITY(1,1) PRIMARY KEY,
  usuario_id       INT NOT NULL,
  token            NVARCHAR(512) NOT NULL,
  expira_en        DATETIME2 NOT NULL,
  creado_eldia        DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[notificaciones]') AND type in (N'U'))
CREATE TABLE notificaciones (
  id               INT IDENTITY(1,1) PRIMARY KEY,
  usuario_id       INT NOT NULL,
  mensaje          NVARCHAR(MAX) NOT NULL,
  leida            BIT DEFAULT 0,
  creado_eldia        DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
GO
