import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins:
    typeof process.env.DEV_ORIGINS === "string"
      ? process.env.DEV_ORIGINS.split(",")
      : undefined,
};

export default nextConfig;
