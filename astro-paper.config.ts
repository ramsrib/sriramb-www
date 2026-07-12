import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://sriramb.com/",
    title: "Sriram Balasubramanian",
    description:
      "Notes on building with AI agents — the tools, the workflows, and what holds up in practice.",
    author: "Sriram Balasubramanian",
    profile: "https://sriramb.com",
    ogImage: "default-og.jpg",
    lang: "en",
    timezone: "America/Los_Angeles",
    dir: "ltr",
  },
  posts: {
    perPage: 8,
    perIndex: 5,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: false,
    },
    search: "pagefind",
  },
  socials: [
    { name: "github", url: "https://github.com/ramsrib" },
    { name: "x", url: "https://x.com/ramsrib" },
    { name: "linkedin", url: "https://www.linkedin.com/in/ramsrib" },
    { name: "mail", url: "mailto:hello@sriramb.com" },
  ],
  shareLinks: [
    { name: "x", url: "https://x.com/intent/post?url=" },
    {
      name: "linkedin",
      url: "https://www.linkedin.com/sharing/share-offsite/?url=",
    },
    { name: "mail", url: "mailto:?subject=See%20this%20post&body=" },
  ],
});
