-- AddUserProfileFields
-- Adiciona campos de perfil do usuário: telefone, celular, data de nascimento, foto de perfil

ALTER TABLE "users" ADD COLUMN "phone" TEXT;
ALTER TABLE "users" ADD COLUMN "mobile" TEXT;
ALTER TABLE "users" ADD COLUMN "birthDate" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "profilePhoto" TEXT;
ALTER TABLE "users" ADD COLUMN "profilePhotoUrl" TEXT;
