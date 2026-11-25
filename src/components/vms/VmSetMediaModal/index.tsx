import { Alert, Form, Modal, Select } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { listVmMedia, setVmMedia, type VirtualMachine, type VmMediaSlot } from "@/api/vms";
import { useVMMutation } from "@/hooks/useVMMutation";
import { validateForm } from "@/lib/form";
import { vmIsClosed } from "@/lib/vms";

type VmSetMediaModalProps = {
  vm: VirtualMachine;
  slot: VmMediaSlot;
  action: string;
  onCancel: () => void;
  onSubmitted: () => void;
};
type VmSetMediaFormValues = { mediaKey: string };

export default function VmSetMediaModal({
  vm,
  slot,
  action,
  onCancel,
  onSubmitted,
}: VmSetMediaModalProps) {
  const [form] = Form.useForm<VmSetMediaFormValues>();
  const media = useQuery({
    queryKey: ["vm-media"],
    queryFn: ({ signal }) => listVmMedia(signal),
    meta: { errorNotification: { id: "vm-media", action: "ISO 镜像列表加载" } },
  });
  const mutation = useVMMutation<VmSetMediaFormValues>({
    vmId: vm.id,
    action,
    actionId: "vm-media-set",
    onSubmitted,
    mutationFn: (values) =>
      setVmMedia(vm.id, slot, { expected_version: vm.version, media_key: values.mediaKey }),
  });
  const kind = slot === "INSTALL" ? "INSTALL_ISO" : "DRIVER_ISO";
  const osFamily = vm.sourceMedia?.osFamily || vm.osFamily;
  const options = (media.data?.items ?? [])
    .filter(
      (item) => item.kind === kind && item.osFamily === osFamily && item.architecture === "amd64",
    )
    .map((item) => ({ value: item.mediaKey, label: item.name }));
  return (
    <Modal
      visible
      title={`${action} · ${vm.name}`}
      onCancel={onCancel}
      confirmLoading={mutation.isPending}
      okButtonProps={{ disabled: vmIsClosed(vm) || mutation.busy || media.isFetching }}
      onOk={async () => {
        if (mutation.busy || vmIsClosed(vm) || media.isFetching) return;
        await mutation.mutateAsync(await validateForm(form));
      }}
    >
      <Alert
        type="info"
        content={`${slot === "INSTALL" ? "选择用于安装操作系统的 ISO 镜像。" : "选择用于安装设备驱动的 ISO 镜像。"}保存后不会自动重启云主机；如提示“下次启动生效”，请在适当时间正常关机再启动。`}
      />
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          field="mediaKey"
          label="ISO 镜像"
          rules={[
            { required: true, message: "请选择 ISO 镜像" },
            {
              validator: (value, callback) => {
                if (!options.some((option) => option.value === value))
                  callback("请选择对应用途的可用 ISO 镜像");
              },
            },
          ]}
        >
          <Select
            loading={media.isFetching}
            filterOption={false}
            placeholder="请选择 ISO 镜像"
            options={options}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
