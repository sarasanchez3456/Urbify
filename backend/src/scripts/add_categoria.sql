IF NOT EXISTS (
  SELECT * FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'categoria_id'
)
BEGIN
  ALTER TABLE usuarios ADD categoria_id INT NULL REFERENCES categorias(id);
  PRINT 'Columna categoria_id agregada';
END
ELSE
  PRINT 'La columna categoria_id ya existe';
