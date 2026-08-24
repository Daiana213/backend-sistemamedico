-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "estado_activo" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "estado_paciente" AS ENUM ('PENDIENTE_APROBACION', 'ACTIVO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "estado_validacion" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "sexo" AS ENUM ('MASCULINO', 'FEMENINO', 'OTRO');

-- CreateTable
CREATE TABLE "administrativo" (
    "id_administrativo" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "puesto" VARCHAR(100) NOT NULL,
    "permiso_gestion_usuarios" BOOLEAN NOT NULL DEFAULT false,
    "estado" "estado_activo" NOT NULL,

    CONSTRAINT "administrativo_pkey" PRIMARY KEY ("id_administrativo")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id_auditoria" SERIAL NOT NULL,
    "id_usuario" INTEGER,
    "fecha_hora" TIMESTAMP(6) NOT NULL,
    "accion" VARCHAR(50) NOT NULL,
    "tabla_afectada" VARCHAR(100) NOT NULL,
    "id_registro_afectado" INTEGER,
    "datos_anteriores" TEXT,
    "datos_nuevos" TEXT,
    "ip" VARCHAR(45),
    "descripcion" VARCHAR(500),

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id_auditoria")
);

-- CreateTable
CREATE TABLE "documento_responsable" (
    "id_documento" SERIAL NOT NULL,
    "id_paciente" INTEGER NOT NULL,
    "id_responsable" INTEGER NOT NULL,
    "tipo_documento" VARCHAR(50) NOT NULL,
    "nombre_archivo" VARCHAR(255) NOT NULL,
    "ruta_archivo" VARCHAR(500) NOT NULL,
    "fecha_carga" TIMESTAMP(6) NOT NULL,
    "estado_validacion" "estado_validacion" NOT NULL,
    "observaciones" VARCHAR(500),

    CONSTRAINT "documento_responsable_pkey" PRIMARY KEY ("id_documento")
);

-- CreateTable
CREATE TABLE "especialidad" (
    "id_especialidad" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "estado" "estado_activo" NOT NULL,

    CONSTRAINT "especialidad_pkey" PRIMARY KEY ("id_especialidad")
);

-- CreateTable
CREATE TABLE "obra_social" (
    "id_obra_social" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "estado" "estado_activo" NOT NULL,

    CONSTRAINT "obra_social_pkey" PRIMARY KEY ("id_obra_social")
);

-- CreateTable
CREATE TABLE "paciente" (
    "id_paciente" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "fecha_nacimiento" DATE NOT NULL,
    "sexo" "sexo" NOT NULL,
    "id_plan" INTEGER,
    "estado" "estado_paciente" NOT NULL,
    "fecha_registro" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "paciente_pkey" PRIMARY KEY ("id_paciente")
);

-- CreateTable
CREATE TABLE "paciente_responsable" (
    "id_paciente" INTEGER NOT NULL,
    "id_responsable" INTEGER NOT NULL,
    "parentesco" VARCHAR(50) NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,
    "estado" "estado_activo" NOT NULL,

    CONSTRAINT "paciente_responsable_pkey" PRIMARY KEY ("id_paciente","id_responsable")
);

-- CreateTable
CREATE TABLE "plan" (
    "id_plan" SERIAL NOT NULL,
    "id_obra_social" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "estado" "estado_activo" NOT NULL,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id_plan")
);

-- CreateTable
CREATE TABLE "profesional" (
    "id_profesional" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "matricula" VARCHAR(50) NOT NULL,
    "estado" "estado_activo" NOT NULL,
    "fecha_alta" DATE NOT NULL,
    "fecha_baja" DATE,

    CONSTRAINT "profesional_pkey" PRIMARY KEY ("id_profesional")
);

-- CreateTable
CREATE TABLE "profesional_especialidad" (
    "id_profesional" INTEGER NOT NULL,
    "id_especialidad" INTEGER NOT NULL,
    "fecha_asignacion" DATE NOT NULL,
    "estado" "estado_activo" NOT NULL,

    CONSTRAINT "profesional_especialidad_pkey" PRIMARY KEY ("id_profesional","id_especialidad")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id_refresh_token" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "fecha_creacion" TIMESTAMP(6) NOT NULL,
    "fecha_expiracion" TIMESTAMP(6) NOT NULL,
    "revocado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id_refresh_token")
);

-- CreateTable
CREATE TABLE "rol" (
    "id_rol" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" VARCHAR(255),

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id_rol")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id_usuario" SERIAL NOT NULL,
    "dni" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "telefono" VARCHAR(30) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "primer_login" BOOLEAN NOT NULL DEFAULT true,
    "estado" "estado_activo" NOT NULL,
    "fecha_alta" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "usuario_rol" (
    "id_usuario" INTEGER NOT NULL,
    "id_rol" INTEGER NOT NULL,
    "estado" "estado_activo" NOT NULL,
    "fecha_asignacion" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "usuario_rol_pkey" PRIMARY KEY ("id_usuario","id_rol")
);

-- CreateIndex
CREATE UNIQUE INDEX "administrativo_id_usuario_key" ON "administrativo"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "especialidad_nombre_key" ON "especialidad"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "obra_social_nombre_key" ON "obra_social"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "paciente_id_usuario_key" ON "paciente"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "profesional_id_usuario_key" ON "profesional"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "profesional_matricula_key" ON "profesional"("matricula");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "refresh_token"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "rol_nombre_key" ON "rol"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_dni_key" ON "usuario"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- AddForeignKey
ALTER TABLE "administrativo" ADD CONSTRAINT "administrativo_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "documento_responsable" ADD CONSTRAINT "documento_responsable_id_paciente_id_responsable_fkey" FOREIGN KEY ("id_paciente", "id_responsable") REFERENCES "paciente_responsable"("id_paciente", "id_responsable") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "paciente" ADD CONSTRAINT "paciente_id_plan_fkey" FOREIGN KEY ("id_plan") REFERENCES "plan"("id_plan") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "paciente" ADD CONSTRAINT "paciente_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "paciente_responsable" ADD CONSTRAINT "paciente_responsable_id_paciente_fkey" FOREIGN KEY ("id_paciente") REFERENCES "paciente"("id_paciente") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "paciente_responsable" ADD CONSTRAINT "paciente_responsable_id_responsable_fkey" FOREIGN KEY ("id_responsable") REFERENCES "paciente"("id_paciente") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "plan" ADD CONSTRAINT "plan_id_obra_social_fkey" FOREIGN KEY ("id_obra_social") REFERENCES "obra_social"("id_obra_social") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "profesional" ADD CONSTRAINT "profesional_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "profesional_especialidad" ADD CONSTRAINT "profesional_especialidad_id_especialidad_fkey" FOREIGN KEY ("id_especialidad") REFERENCES "especialidad"("id_especialidad") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "profesional_especialidad" ADD CONSTRAINT "profesional_especialidad_id_profesional_fkey" FOREIGN KEY ("id_profesional") REFERENCES "profesional"("id_profesional") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "rol"("id_rol") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;

