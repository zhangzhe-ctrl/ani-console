import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  listNetworkSubnets,
  listNetworkVpcs,
  type NetworkSubnetListParams,
  type NetworkVPCListParams,
} from "@/api/network";
import { useAuthStore } from "@/stores/auth";

export function useVpcOptions(params: NetworkVPCListParams, enabled: boolean) {
  const session = useAuthStore((state) => state.getAccessTokenJti());
  const client = useQueryClient();
  const queryKey = ["network-vpcs", "options", session, params];
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      listNetworkVpcs({ ...params, page: pageParam, pageSize: 100 }, signal),
    getNextPageParam: (lastPage, pages, page) =>
      (lastPage.items?.length ?? 0) > 0 &&
      pages.reduce((count, item) => count + (item.items?.length ?? 0), 0) < Number(lastPage.total)
        ? page + 1
        : undefined,
    enabled,
    refetchOnMount: "always",
    meta: { errorNotification: { id: "vpc-options", action: "VPC 选项加载" } },
  });
  return {
    ...query,
    items: Array.from(
      new Map(
        query.data?.pages.flatMap((page) => page.items ?? []).map((item) => [item.id, item]),
      ).values(),
    ),
    refresh: () => client.resetQueries({ queryKey, exact: true }),
  };
}

export function useSubnetOptions(params: NetworkSubnetListParams, enabled: boolean) {
  const session = useAuthStore((state) => state.getAccessTokenJti());
  const client = useQueryClient();
  const queryKey = ["network-subnets", "options", session, params];
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: undefined as string | undefined,
    // 子网正式 API 仍为 cursor/limit；后续页只由用户操作加载。
    queryFn: ({ pageParam, signal }) =>
      listNetworkSubnets({ ...params, limit: 100, cursor: pageParam }, signal),
    getNextPageParam: (lastPage, _pages, cursor, cursors) => {
      const next = lastPage.next_cursor || undefined;
      return next && next !== cursor && !cursors.includes(next) ? next : undefined;
    },
    enabled,
    refetchOnMount: "always",
    meta: { errorNotification: { id: "subnet-options", action: "子网选项加载" } },
  });
  return {
    ...query,
    items: Array.from(
      new Map(
        query.data?.pages.flatMap((page) => page.items ?? []).map((item) => [item.id, item]),
      ).values(),
    ),
    refresh: () => client.resetQueries({ queryKey, exact: true }),
  };
}
