-- DropTable
DROP TABLE "codigo_verificacion";

-- CreateIndex
CREATE INDEX "idx_turno_profesional_fechahora" ON "turno"("id_profesional", "fecha_hora");

-- CreateIndex
CREATE INDEX "idx_turno_profesional_fechahora_estado" ON "turno"("id_profesional", "fecha_hora", "estado");
