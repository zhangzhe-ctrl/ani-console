import { createRouter } from "@tanstack/react-router";
import { queryClient } from "@/lib/query-client";
import { routeTree } from "@/routeTree.gen";

export const router = createRouter({
  routeTree,
  trailingSlash: "never",
  context: { queryClient },
});
