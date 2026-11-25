import { useState } from "react";
import { Alert, Button, Descriptions, Modal, Typography } from "@arco-design/web-react";
import { ejectVmMedia, type VirtualMachine, type VmMediaSlot, type VmMediaState } from "@/api/vms";
import { DataTable, StatusBadge, type RowAction } from "@/components/common";
import VmSetMediaModal from "@/components/vms/VmSetMediaModal";
import VmSetBootDeviceModal from "@/components/vms/VmSetBootDeviceModal";
import { useVMMutation } from "@/hooks/useVMMutation";
import { vmIsClosed } from "@/lib/vms";

type VmMediaDevicesProps = { vm: VirtualMachine };
type MediaSlotRow = { slot: VmMediaSlot; state?: VmMediaState };
const SLOTS: VmMediaSlot[] = ["INSTALL", "DRIVER"];

function hasMedia({ state }: MediaSlotRow) {
  return Boolean(state?.desiredMedia || state?.observedMedia);
}

function mediaActionLabel(row: MediaSlotRow) {
  if (!row.state) return "加载/更换";
  return hasMedia(row) ? "更换" : "加载";
}

export default function VmMediaDevices({ vm }: VmMediaDevicesProps) {
  const [editingMedia, setEditingMedia] = useState<{ slot: VmMediaSlot; action: string }>();
  const [editingBoot, setEditingBoot] = useState(false);
  const eject = useVMMutation<VmMediaSlot>({
    vmId: vm.id,
    action: "弹出",
    actionId: "vm-media-eject",
    channel: "notification",
    mutationFn: (slot) => ejectVmMedia(vm.id, slot, { expected_version: vm.version }),
  });
  const disabled = vmIsClosed(vm) || eject.busy;
  const ejectDisabledReason = () => {
    if (vmIsClosed(vm)) {
      if (vm.observedState === "Deleted") return "云主机已删除，无法弹出镜像";
      if (vm.observedState === "canceled") return "云主机创建已取消，无法弹出镜像";
      if (vm.closing) return "云主机正在删除，暂时无法弹出镜像";
      return "云主机版本尚未就绪，请刷新后重试";
    }
    if (eject.busy) return "有云主机操作正在提交，请稍后重试";
    return undefined;
  };
  const actions: RowAction<MediaSlotRow>[] = [
    {
      key: "set",
      label: mediaActionLabel,
      disabled: () => disabled,
      onClick: (row) => setEditingMedia({ slot: row.slot, action: mediaActionLabel(row) }),
    },
    {
      key: "eject",
      label: "弹出",
      visible: hasMedia,
      disabled: () => Boolean(ejectDisabledReason()),
      title: ejectDisabledReason,
      onClick: (row) => {
        Modal.confirm({
          title: "弹出",
          content: `确认弹出 ${vm.name} 的镜像？此操作不会删除磁盘数据，也不会自动重启云主机。若镜像仍在使用，变更将在下次启动时生效。`,
          onOk: () => eject.mutateAsync(row.slot),
        });
      },
    },
  ];
  return (
    <div className="flex flex-col gap-4">
      <Alert
        type="info"
        content="安装镜像用于安装操作系统，驱动镜像用于安装设备驱动。镜像和启动设备的配置变更不会自动重启云主机，具体生效情况请查看配置状态。"
      />
      <DataTable<MediaSlotRow>
        header={{ title: "虚拟光驱" }}
        data={SLOTS.map((slot) => ({ slot, state: vm.media?.find((item) => item.slot === slot) }))}
        rowKey="slot"
        pagination={false}
        tableLabel="云主机虚拟光驱"
        rowActions={actions}
        columns={[
          {
            title: "用途",
            width: 150,
            fixed: "left",
            render: (_, row) => (row.slot === "INSTALL" ? "系统安装" : "驱动安装"),
          },
          {
            title: "配置状态",
            width: 120,
            render: (_, row) => {
              if (!row.state) return <StatusBadge tone="neutral">待采集</StatusBadge>;
              if (row.state.pendingRestart)
                return <StatusBadge tone="warning">下次启动生效</StatusBadge>;
              if (!row.state.effectiveNow) return <StatusBadge tone="neutral">待确认</StatusBadge>;
              return (
                <StatusBadge tone={row.state.observedMedia ? "success" : "neutral"}>
                  {row.state.observedMedia ? "已生效" : "无镜像"}
                </StatusBadge>
              );
            },
          },
          {
            title: "已配置镜像",
            width: 220,
            dataIndex: "state.desiredMedia",
            render: (_, row) => (row.state ? row.state.desiredMedia || "未加载镜像" : "待采集"),
            ellipsis: true,
          },
          {
            title: "当前镜像",
            width: 220,
            dataIndex: "state.observedMedia",
            ellipsis: true,
          },
        ]}
      />
      <section className="flex flex-col gap-2">
        <Descriptions
          title={
            <div className="flex items-center justify-between gap-3">
              <span>启动设置</span>
              <Button
                size="small"
                type="text"
                disabled={disabled}
                onClick={() => setEditingBoot(true)}
              >
                切换启动设备
              </Button>
            </div>
          }
          size="medium"
          column={1}
          tableLayout="fixed"
          labelStyle={{ width: 120, verticalAlign: "top" }}
          valueStyle={{ overflowWrap: "anywhere", verticalAlign: "top" }}
          data={[
            {
              label: "下次启动设备",
              value:
                vm.bootDevice === "SYSTEM_DISK"
                  ? "系统盘"
                  : vm.bootDevice === "INSTALL_MEDIA"
                    ? "安装镜像（ISO）"
                    : "-",
            },
          ]}
        />
        <Typography.Text type="secondary">
          安装系统时选择安装镜像（ISO），安装完成后切换为系统盘。新配置在下次启动时使用。
        </Typography.Text>
      </section>
      {editingMedia && (
        <VmSetMediaModal
          vm={vm}
          slot={editingMedia.slot}
          action={editingMedia.action}
          onCancel={() => setEditingMedia(undefined)}
          onSubmitted={() => setEditingMedia(undefined)}
        />
      )}
      {editingBoot && (
        <VmSetBootDeviceModal
          vm={vm}
          onCancel={() => setEditingBoot(false)}
          onSubmitted={() => setEditingBoot(false)}
        />
      )}
    </div>
  );
}
