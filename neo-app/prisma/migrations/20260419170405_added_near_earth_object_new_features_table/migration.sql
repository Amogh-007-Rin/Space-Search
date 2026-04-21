/*
  Warnings:

  - You are about to drop the `user` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "user";

-- CreateTable
CREATE TABLE "Admin" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NearEarthObjectNewFeatures" (
    "featureId" SERIAL NOT NULL,
    "diameter_avg" DOUBLE PRECISION NOT NULL,
    "diameter_ratio" DOUBLE PRECISION NOT NULL,
    "log_diameter_avg" DOUBLE PRECISION NOT NULL,
    "log_diameter_ratio" DOUBLE PRECISION NOT NULL,
    "log_relative_velocity" DOUBLE PRECISION NOT NULL,
    "log_miss_distance" DOUBLE PRECISION NOT NULL,
    "absolute_magnitude" DOUBLE PRECISION NOT NULL,
    "hazardous" INTEGER NOT NULL,
    "sourceNeoId" INTEGER,

    CONSTRAINT "NearEarthObjectNewFeatures_pkey" PRIMARY KEY ("featureId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- AddForeignKey
ALTER TABLE "NearEarthObjectNewFeatures" ADD CONSTRAINT "NearEarthObjectNewFeatures_sourceNeoId_fkey" FOREIGN KEY ("sourceNeoId") REFERENCES "NearEarthObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
