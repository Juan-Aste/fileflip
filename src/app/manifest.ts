import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fileflect",
    short_name: "Fileflect",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f5f1",
    theme_color: "#0b6f6a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
