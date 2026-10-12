-- AlterTable
ALTER TABLE "consulta" ADD COLUMN     "motivo_consulta" TEXT NOT NULL,
ALTER COLUMN "diagnostico" SET NOT NULL,
ALTER COLUMN "tratamiento" SET NOT NULL;

-- CreateTable
CREATE TABLE "antecedentes_medicos" (
    "id_antecedentes" SERIAL NOT NULL,
    "id_paciente" INTEGER NOT NULL,
    "alergias" TEXT,
    "enfermedades_cronicas" TEXT,
    "grupo_sanguineo" VARCHAR(3),

    CONSTRAINT "antecedentes_medicos_pkey" PRIMARY KEY ("id_antecedentes")
);

-- CreateTable
CREATE TABLE "codigo_verificacion" (
    "id_codigo" SERIAL NOT NULL,
    "telefono" VARCHAR(30) NOT NULL,
    "codigo" VARCHAR(6) NOT NULL,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_expiracion" TIMESTAMP(6) NOT NULL,
    "utilizado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "codigo_verificacion_pkey" PRIMARY KEY ("id_codigo")
);

-- CreateIndex
CREATE UNIQUE INDEX "antecedentes_medicos_id_paciente_key" ON "antecedentes_medicos"("id_paciente");

-- AddForeignKey
ALTER TABLE "antecedentes_medicos" ADD CONSTRAINT "antecedentes_medicos_id_paciente_fkey" FOREIGN KEY ("id_paciente") REFERENCES "paciente"("id_paciente") ON DELETE CASCADE ON UPDATE NO ACTION;
