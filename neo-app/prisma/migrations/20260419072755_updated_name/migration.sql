/*
  Warnings:

  - You are about to drop the column `relative_valocity` on the `NearEarthObject` table. All the data in the column will be lost.
  - You are about to drop the `NearEarthObjectNewFeatures` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `relative_velocity` to the `NearEarthObject` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "NearEarthObject" DROP COLUMN "relative_valocity",
ADD COLUMN     "relative_velocity" DOUBLE PRECISION NOT NULL;

-- DropTable
DROP TABLE "NearEarthObjectNewFeatures";
