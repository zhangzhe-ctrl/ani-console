import { Button, Select, type SelectProps } from "@arco-design/web-react";
import { useState } from "react";
import type { NetworkSubnet } from "@/api/network";
import { useSubnetOptions } from "@/hooks/useNetworkSelectionOptions";

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
  const subnets = useSubnetOptions(params, !disabled && (!canUse || Boolean(vpcId)));
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
      onVisibleChange={(visible) => {
        if (visible) subnets.refresh();
      }}
      renderFormat={(option) => {
        const item = subnets.items.find((candidate) => candidate.id === props.value) ?? selected;
        return item && item.id === props.value
          ? `${item.name}${item.owner_scope === "platform" ? " · 平台基础网络" : ""} · ${item.cidr || "-"}`
          : (option?.children ?? props.value);
      }}
      dropdownRender={(menu) => (
        <>
          {menu}
          <div className="flex justify-between p-2" onMouseDown={(event) => event.preventDefault()}>
            <Button size="mini" onClick={subnets.refresh} loading={subnets.isFetching}>
              刷新
            </Button>
            <Button
              size="mini"
              disabled={!subnets.hasNextPage || subnets.isFetching}
              loading={subnets.isFetchingNextPage}
              onClick={() => subnets.fetchNextPage()}
            >
              {subnets.hasNextPage ? "加载更多" : "已加载全部"}
            </Button>
          </div>
        </>
      )}
      options={subnets.items.map((subnet) => ({
        value: subnet.id,
        extra: subnet,
        label: `${subnet.name}${subnet.owner_scope === "platform" ? " · 平台基础网络" : ""} · ${subnet.cidr || "-"}`,
      }))}
    />
  );
}
