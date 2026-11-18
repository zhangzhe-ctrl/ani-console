import { Select, type SelectProps } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listNetworkSubnets, type NetworkSubnet } from "@/api/network";
import { useAuthStore } from "@/stores/auth";

type SubnetSelectProps = Pick<
  SelectProps,
  "disabled" | "allowClear" | "placeholder" | "onBlur" | "className" | "style"
> & {
  value?: string;
  onChange?: (id: string | undefined, subnet: NetworkSubnet | undefined) => void;
  "aria-label"?: string;
  vpcId?: string;
  canUse?: boolean;
  canManage?: boolean;
};

export default function SubnetSelect({
  vpcId,
  canUse,
  canManage,
  disabled,
  onChange,
  ...props
}: SubnetSelectProps) {
  const [search, setSearch] = useState({ vpcId, name: "" });
  const name = search.vpcId === vpcId ? search.name : "";
  const params = {
    vpc_id: vpcId || undefined,
    name: name.trim() || undefined,
    can_use: canUse,
    can_manage: canManage,
  };
  const session = useAuthStore((state) => state.getAccessTokenJti());
  const subnets = useQuery({
    queryKey: ["network-subnets", "options", session, params],
    // TODO(subnet-pagination): 子网仍用 cursor/limit，待后端改为 page/pageSize 后统一选项查询。
    queryFn: ({ signal }) => listNetworkSubnets({ ...params, limit: 100 }, signal),
    enabled: !disabled && (!canUse || Boolean(vpcId)),
    refetchOnMount: "always",
    meta: { errorNotification: { id: "subnet-options", action: "子网选项加载" } },
  });
  const items = subnets.data?.items ?? [];
  const [selected, setSelected] = useState<NetworkSubnet>();

  return (
    <Select
      placeholder="请选择子网"
      {...props}
      onChange={(id, option) => {
        const item = Array.isArray(option)
          ? undefined
          : (option?.extra as NetworkSubnet | undefined);
        setSelected(item);
        onChange?.(id, item);
      }}
      disabled={disabled}
      loading={subnets.isFetching}
      showSearch
      filterOption={false}
      inputValue={name}
      onInputValueChange={(value) => setSearch({ vpcId, name: value })}
      renderFormat={(option) => {
        const item = items.find((candidate) => candidate.id === props.value) ?? selected;
        return item && item.id === props.value
          ? `${item.name}${item.owner_scope === "platform" ? " · 平台基础网络" : ""} · ${item.cidr || "-"}`
          : (option?.children ?? props.value);
      }}
      options={items.map((subnet) => ({
        value: subnet.id,
        extra: subnet,
        label: `${subnet.name}${subnet.owner_scope === "platform" ? " · 平台基础网络" : ""} · ${subnet.cidr || "-"}`,
      }))}
    />
  );
}
