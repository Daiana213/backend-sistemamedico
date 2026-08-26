-- CreateTable
CREATE TABLE IF NOT EXISTS "password_reset_token" (
    "id_password_reset_token" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "fecha_creacion" TIMESTAMP(6) NOT NULL,
    "fecha_expiracion" TIMESTAMP(6) NOT NULL,
    "utilizado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("id_password_reset_token")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_token_token_hash_key" ON "password_reset_token"("token_hash");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'password_reset_token_id_usuario_fkey'
    ) THEN
        ALTER TABLE "password_reset_token"
        ADD CONSTRAINT "password_reset_token_id_usuario_fkey"
        FOREIGN KEY ("id_usuario")
        REFERENCES "usuario"("id_usuario")
        ON DELETE NO ACTION
        ON UPDATE NO ACTION;
    END IF;
END $$;
