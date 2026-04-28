-- CreateTable
CREATE TABLE "NearEarthObject" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "est_diameter_min" DOUBLE PRECISION NOT NULL,
    "est_diameter_max" DOUBLE PRECISION NOT NULL,
    "relative_valocity" DOUBLE PRECISION NOT NULL,
    "miss_distance" DOUBLE PRECISION NOT NULL,
    "orbiting_body" TEXT NOT NULL DEFAULT 'EARTH',
    "sentry_object" BOOLEAN NOT NULL,
    "absolute_magnitude" DOUBLE PRECISION NOT NULL,
    "hazardous" BOOLEAN NOT NULL,

    CONSTRAINT "NearEarthObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NearEarthObjectNewFeatures" (
    "featureId" SERIAL NOT NULL,

    CONSTRAINT "NearEarthObjectNewFeatures_pkey" PRIMARY KEY ("featureId")
);
