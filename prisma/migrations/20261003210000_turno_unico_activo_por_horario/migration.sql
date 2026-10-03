-- 1. Limpieza de duplicados existentes (mismo profesional + fecha_hora con turno activo).
--    Se conserva el turno con menor id_turno.
--    Los duplicados sin consulta asociada se eliminan; si tienen consulta, se cancelan.
WITH duplicados AS (
  SELECT id_turno
  FROM (
    SELECT id_turno,
           ROW_NUMBER() OVER (
             PARTITION BY id_profesional, fecha_hora
             ORDER BY id_turno
           ) AS rn
    FROM "turno"
    WHERE "estado" IN ('SOLICITADO', 'CONFIRMADO')
  ) t
  WHERE rn > 1
)
UPDATE "turno"
SET "estado" = 'CANCELADO',
    "motivo_cancelacion" = 'Turno duplicado eliminado automaticamente'
WHERE id_turno IN (SELECT id_turno FROM duplicados)
  AND EXISTS (SELECT 1 FROM "consulta" c WHERE c.id_turno = "turno".id_turno);

DELETE FROM "turno"
WHERE id_turno IN (
  SELECT id_turno
  FROM (
    SELECT id_turno,
           ROW_NUMBER() OVER (
             PARTITION BY id_profesional, fecha_hora
             ORDER BY id_turno
           ) AS rn
    FROM "turno"
    WHERE "estado" IN ('SOLICITADO', 'CONFIRMADO')
  ) t
  WHERE rn > 1
)
AND NOT EXISTS (SELECT 1 FROM "consulta" c WHERE c.id_turno = "turno".id_turno);

-- 2. Garantia a nivel de BD: un solo turno activo por profesional y horario.
--    Indice unico parcial (Prisma no lo soporta en schema.prisma).
CREATE UNIQUE INDEX "uq_turno_profesional_fechahora_activo"
  ON "turno" ("id_profesional", "fecha_hora")
  WHERE "estado" IN ('SOLICITADO', 'CONFIRMADO');
