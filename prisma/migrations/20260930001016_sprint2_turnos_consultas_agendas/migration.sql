-- CreateEnum
CREATE TYPE "estado_turno" AS ENUM ('SOLICITADO', 'CONFIRMADO', 'REPROGRAMADO', 'CANCELADO', 'COMPLETADO');

-- AlterTable
ALTER TABLE "administrativo" ADD COLUMN     "email_alternativo" VARCHAR(150),
ADD COLUMN     "telefono_alternativo" VARCHAR(30);

-- AlterTable
ALTER TABLE "documento_responsable" ADD COLUMN     "intentos" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "paciente" ADD COLUMN     "email_alternativo" VARCHAR(150),
ADD COLUMN     "telefono_alternativo" VARCHAR(30),
ALTER COLUMN "sexo" DROP NOT NULL;

-- AlterTable
ALTER TABLE "profesional" ADD COLUMN     "email_alternativo" VARCHAR(150),
ADD COLUMN     "telefono_alternativo" VARCHAR(30);

-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "bloqueado_hasta" TIMESTAMP(6),
ADD COLUMN     "intentos_fallidos" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "agenda_profesional" (
    "id_agenda_profesional" SERIAL NOT NULL,
    "id_profesional" INTEGER NOT NULL,
    "dia_semana" INTEGER NOT NULL,
    "hora_inicio" VARCHAR(10) NOT NULL,
    "hora_fin" VARCHAR(10) NOT NULL,
    "duracion_turno_minutos" INTEGER NOT NULL DEFAULT 30,
    "estado" "estado_activo" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "agenda_profesional_pkey" PRIMARY KEY ("id_agenda_profesional")
);

-- CreateTable
CREATE TABLE "turno" (
    "id_turno" SERIAL NOT NULL,
    "id_paciente" INTEGER NOT NULL,
    "id_profesional" INTEGER NOT NULL,
    "fecha_hora" TIMESTAMP(6) NOT NULL,
    "estado" "estado_turno" NOT NULL DEFAULT 'SOLICITADO',
    "motivo_cancelacion" VARCHAR(500),

    CONSTRAINT "turno_pkey" PRIMARY KEY ("id_turno")
);

-- CreateTable
CREATE TABLE "consulta" (
    "id_consulta" SERIAL NOT NULL,
    "id_turno" INTEGER NOT NULL,
    "diagnostico" TEXT,
    "tratamiento" TEXT,
    "notas_adicionales" TEXT,
    "fecha_realizacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consulta_pkey" PRIMARY KEY ("id_consulta")
);

-- CreateIndex
CREATE UNIQUE INDEX "consulta_id_turno_key" ON "consulta"("id_turno");

-- AddForeignKey
ALTER TABLE "agenda_profesional" ADD CONSTRAINT "agenda_profesional_id_profesional_fkey" FOREIGN KEY ("id_profesional") REFERENCES "profesional"("id_profesional") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "turno" ADD CONSTRAINT "turno_id_paciente_fkey" FOREIGN KEY ("id_paciente") REFERENCES "paciente"("id_paciente") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "turno" ADD CONSTRAINT "turno_id_profesional_fkey" FOREIGN KEY ("id_profesional") REFERENCES "profesional"("id_profesional") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consulta" ADD CONSTRAINT "consulta_id_turno_fkey" FOREIGN KEY ("id_turno") REFERENCES "turno"("id_turno") ON DELETE NO ACTION ON UPDATE NO ACTION;
