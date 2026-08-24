-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EstadoActivo" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "EstadoPaciente" AS ENUM ('PENDIENTE_APROBACION', 'ACTIVO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "EstadoValidacion" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('MASCULINO', 'FEMENINO', 'OTRO');

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
    "estado" "EstadoActivo" NOT NULL,
    "fecha_alta" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "rol" (
    "id_rol" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" VARCHAR(255),

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id_rol")
);

-- CreateTable
CREATE TABLE "usuario_rol" (
    "id_usuario" INTEGER NOT NULL,
    "id_rol" INTEGER NOT NULL,
    "estado" "EstadoActivo" NOT NULL,
    "fecha_asignacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_rol_pkey" PRIMARY KEY ("id_usuario","id_rol")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id_refresh_token" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL,
    "fecha_expiracion" TIMESTAMP(3) NOT NULL,
    "revocado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id_refresh_token")
);

-- CreateTable
CREATE TABLE "obra_social" (
    "id_obra_social" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "estado" "EstadoActivo" NOT NULL,

    CONSTRAINT "obra_social_pkey" PRIMARY KEY ("id_obra_social")
);

-- CreateTable
CREATE TABLE "plan" (
    "id_plan" SERIAL NOT NULL,
    "id_obra_social" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "estado" "EstadoActivo" NOT NULL,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id_plan")
);

-- CreateTable
CREATE TABLE "paciente" (
    "id_paciente" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "fecha_nacimiento" DATE NOT NULL,
    "sexo" "Sexo" NOT NULL,
    "id_plan" INTEGER,
    "estado" "EstadoPaciente" NOT NULL,
    "fecha_registro" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paciente_pkey" PRIMARY KEY ("id_paciente")
);

-- CreateTable
CREATE TABLE "paciente_responsable" (
    "id_paciente" INTEGER NOT NULL,
    "id_responsable" INTEGER NOT NULL,
    "parentesco" VARCHAR(50) NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,
    "estado" "EstadoActivo" NOT NULL,

    CONSTRAINT "paciente_responsable_pkey" PRIMARY KEY ("id_paciente","id_responsable")
);

-- CreateTable
CREATE TABLE "documento_responsable" (
    "id_documento" SERIAL NOT NULL,
    "id_paciente" INTEGER NOT NULL,
    "id_responsable" INTEGER NOT NULL,
    "tipo_documento" VARCHAR(50) NOT NULL,
    "nombre_archivo" VARCHAR(255) NOT NULL,
    "ruta_archivo" VARCHAR(500) NOT NULL,
    "fecha_carga" TIMESTAMP(3) NOT NULL,
    "estado_validacion" "EstadoValidacion" NOT NULL,
    "observaciones" VARCHAR(500),

    CONSTRAINT "documento_responsable_pkey" PRIMARY KEY ("id_documento")
);

-- CreateTable
CREATE TABLE "profesional" (
    "id_profesional" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "matricula" VARCHAR(50) NOT NULL,
    "estado" "EstadoActivo" NOT NULL,
    "fecha_alta" DATE NOT NULL,
    "fecha_baja" DATE,

    CONSTRAINT "profesional_pkey" PRIMARY KEY ("id_profesional")
);

-- CreateTable
CREATE TABLE "especialidad" (
    "id_especialidad" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "estado" "EstadoActivo" NOT NULL,

    CONSTRAINT "especialidad_pkey" PRIMARY KEY ("id_especialidad")
);

-- CreateTable
CREATE TABLE "profesional_especialidad" (
    "id_profesional" INTEGER NOT NULL,
    "id_especialidad" INTEGER NOT NULL,
    "fecha_asignacion" DATE NOT NULL,
    "estado" "EstadoActivo" NOT NULL,

    CONSTRAINT "profesional_especialidad_pkey" PRIMARY KEY ("id_profesional","id_especialidad")
);

-- CreateTable
CREATE TABLE "administrativo" (
    "id_administrativo" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "puesto" VARCHAR(100) NOT NULL,
    "permiso_gestion_usuarios" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoActivo" NOT NULL,

    CONSTRAINT "administrativo_pkey" PRIMARY KEY ("id_administrativo")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id_auditoria" SERIAL NOT NULL,
    "id_usuario" INTEGER,
    "fecha_hora" TIMESTAMP(3) NOT NULL,
    "accion" VARCHAR(50) NOT NULL,
    "tabla_afectada" VARCHAR(100) NOT NULL,
    "id_registro_afectado" INTEGER,
    "datos_anteriores" TEXT,
    "datos_nuevos" TEXT,
    "ip" VARCHAR(45),
    "descripcion" VARCHAR(500),

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id_auditoria")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_dni_key" ON "usuario"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "rol_nombre_key" ON "rol"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "refresh_token"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "obra_social_nombre_key" ON "obra_social"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "paciente_id_usuario_key" ON "paciente"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "profesional_id_usuario_key" ON "profesional"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "profesional_matricula_key" ON "profesional"("matricula");

-- CreateIndex
CREATE UNIQUE INDEX "especialidad_nombre_key" ON "especialidad"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "administrativo_id_usuario_key" ON "administrativo"("id_usuario");

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "rol"("id_rol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan" ADD CONSTRAINT "plan_id_obra_social_fkey" FOREIGN KEY ("id_obra_social") REFERENCES "obra_social"("id_obra_social") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paciente" ADD CONSTRAINT "paciente_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paciente" ADD CONSTRAINT "paciente_id_plan_fkey" FOREIGN KEY ("id_plan") REFERENCES "plan"("id_plan") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paciente_responsable" ADD CONSTRAINT "paciente_responsable_id_paciente_fkey" FOREIGN KEY ("id_paciente") REFERENCES "paciente"("id_paciente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paciente_responsable" ADD CONSTRAINT "paciente_responsable_id_responsable_fkey" FOREIGN KEY ("id_responsable") REFERENCES "paciente"("id_paciente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_responsable" ADD CONSTRAINT "documento_responsable_id_paciente_id_responsable_fkey" FOREIGN KEY ("id_paciente", "id_responsable") REFERENCES "paciente_responsable"("id_paciente", "id_responsable") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profesional" ADD CONSTRAINT "profesional_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profesional_especialidad" ADD CONSTRAINT "profesional_especialidad_id_profesional_fkey" FOREIGN KEY ("id_profesional") REFERENCES "profesional"("id_profesional") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profesional_especialidad" ADD CONSTRAINT "profesional_especialidad_id_especialidad_fkey" FOREIGN KEY ("id_especialidad") REFERENCES "especialidad"("id_especialidad") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administrativo" ADD CONSTRAINT "administrativo_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

