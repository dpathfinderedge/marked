import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  site: "https://maarked.vercel.app",
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
  ]
});