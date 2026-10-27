-- CreateTable
CREATE TABLE IF NOT EXISTS "estudio_medico" (
    "id_estudio" SERIAL NOT NULL,
    "id_paciente" INTEGER NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "codigo" VARCHAR(150) NOT NULL,
    "observacion" TEXT,
    "estado" "estado_activo" NOT NULL DEFAULT 'ACTIVO',
    "fecha_carga" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estudio_medico_pkey" PRIMARY KEY ("id_estudio")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_estudio_medico_paciente_estado" ON "estudio_medico"("id_paciente", "estado");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'estudio_medico_id_paciente_fkey'
    ) THEN
        ALTER TABLE "estudio_medico"
        ADD CONSTRAINT "estudio_medico_id_paciente_fkey"
        FOREIGN KEY ("id_paciente") REFERENCES "paciente"("id_paciente")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;
