import { Button, Select, type SelectProps } from "@arco-design/web-react";
import { useState } from "react";
import type { NetworkVPC } from "@/api/network";
import { useVpcOptions } from "@/hooks/useNetworkSelectionOptions";

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
  const vpcs = useVpcOptions(params, !disabled);
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
      onVisibleChange={(visible) => {
        if (visible) vpcs.refresh();
      }}
      renderFormat={(option) => {
        const item = vpcs.items.find((candidate) => candidate.id === props.value) ?? selected;
        return item && item.id === props.value
          ? `${item.name}${item.owner_scope === "platform" ? " · 平台基础网络" : ""} · ${item.cidr || "-"}`
          : (option?.children ?? props.value);
      }}
      dropdownRender={(menu) => (
        <>
          {menu}
          <div className="flex justify-between p-2" onMouseDown={(event) => event.preventDefault()}>
            <Button size="mini" onClick={vpcs.refresh} loading={vpcs.isFetching}>
              刷新
            </Button>
            <Button
              size="mini"
              disabled={!vpcs.hasNextPage || vpcs.isFetching}
              loading={vpcs.isFetchingNextPage}
              onClick={() => vpcs.fetchNextPage()}
            >
              {vpcs.hasNextPage ? "加载更多" : "已加载全部"}
            </Button>
          </div>
        </>
      )}
      options={vpcs.items.map((vpc) => ({
        value: vpc.id,
        extra: vpc,
        label: `${vpc.name}${vpc.owner_scope === "platform" ? " · 平台基础网络" : ""} · ${vpc.cidr || "-"}`,
      }))}
    />
  );
}
