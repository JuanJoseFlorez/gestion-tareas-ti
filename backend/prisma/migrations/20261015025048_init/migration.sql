-- CreateEnum
CREATE TYPE "request_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "request_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "technician" (
    "id" SERIAL NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "technician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_type" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "service_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_request" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "requester_name" VARCHAR(120) NOT NULL,
    "requester_email" VARCHAR(150) NOT NULL,
    "priority" "request_priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "request_status" NOT NULL DEFAULT 'PENDING',
    "technician_id" INTEGER,
    "service_type_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "service_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "technician_email_key" ON "technician"("email");

-- CreateIndex
CREATE UNIQUE INDEX "service_type_name_key" ON "service_type"("name");

-- CreateIndex
CREATE INDEX "service_request_technician_id_idx" ON "service_request"("technician_id");

-- CreateIndex
CREATE INDEX "service_request_service_type_id_idx" ON "service_request"("service_type_id");

-- CreateIndex
CREATE INDEX "service_request_status_idx" ON "service_request"("status");

-- AddForeignKey
ALTER TABLE "service_request" ADD CONSTRAINT "service_request_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_request" ADD CONSTRAINT "service_request_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Business rule: in-progress and completed requests must have an assigned technician.
-- Added manually because Prisma does not support CHECK constraints in the schema.
ALTER TABLE "service_request"
  ADD CONSTRAINT "chk_service_request_technician_required"
  CHECK ("status" IN ('PENDING', 'CANCELLED') OR "technician_id" IS NOT NULL);
