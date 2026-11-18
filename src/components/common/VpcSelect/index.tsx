import { Select, type SelectProps } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listNetworkVpcs, type NetworkVPC } from "@/api/network";
import { withFirst100 } from "@/api/pagination";
import { useAuthStore } from "@/stores/auth";

const listVpcOptions = withFirst100(listNetworkVpcs);

type VpcSelectProps = Pick<
  SelectProps,
  "disabled" | "allowClear" | "placeholder" | "onBlur" | "className" | "style"
> & {
  value?: string;
  onChange?: (id: string | undefined, vpc: NetworkVPC | undefined) => void;
  "aria-label"?: string;
  canUse?: boolean;
  canManage?: boolean;
};

export default function VpcSelect({
  canUse,
  canManage,
  disabled,
  onChange,
  ...props
}: VpcSelectProps) {
  const [name, setName] = useState("");
  const params = { name: name.trim() || undefined, can_use: canUse, can_manage: canManage };
  const session = useAuthStore((state) => state.getAccessTokenJti());
  const vpcs = useQuery({
    queryKey: ["network-vpcs", "options", session, params],
    queryFn: ({ signal }) => listVpcOptions(params, signal),
    enabled: !disabled,
    refetchOnMount: "always",
    meta: { errorNotification: { id: "vpc-options", action: "VPC 选项加载" } },
  });
  const items = vpcs.data?.items ?? [];
  const [selected, setSelected] = useState<NetworkVPC>();

  return (
    <Select
      placeholder="请选择 VPC"
      {...props}
      onChange={(id, option) => {
        const item = Array.isArray(option) ? undefined : (option?.extra as NetworkVPC | undefined);
        setSelected(item);
        onChange?.(id, item);
      }}
      disabled={disabled}
      loading={vpcs.isFetching}
      showSearch
      filterOption={false}
      inputValue={name}
      onInputValueChange={setName}
      renderFormat={(option) => {
        const item = items.find((candidate) => candidate.id === props.value) ?? selected;
        return item && item.id === props.value
          ? `${item.name}${item.owner_scope === "platform" ? " · 平台基础网络" : ""} · ${item.cidr || "-"}`
          : (option?.children ?? props.value);
      }}
      options={items.map((vpc) => ({
        value: vpc.id,
        extra: vpc,
        label: `${vpc.name}${vpc.owner_scope === "platform" ? " · 平台基础网络" : ""} · ${vpc.cidr || "-"}`,
      }))}
    />
  );
}
