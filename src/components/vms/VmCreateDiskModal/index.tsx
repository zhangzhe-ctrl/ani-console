import { Form, Input, InputNumber, Modal } from "@arco-design/web-react";
import { createVmDisk, type VirtualMachine } from "@/api/vms";
import { useVMMutation } from "@/hooks/useVMMutation";
import { capacityToBytes, MAX_CAPACITY_GIB } from "@/lib/capacity";
import { validateForm } from "@/lib/form";
import { vmIsClosed } from "@/lib/vms";

type VmCreateDiskModalProps = { vm: VirtualMachine; onCancel: () => void; onSubmitted: () => void };
type VmCreateDiskFormValues = { name: string; sizeGib: number };

export default function VmCreateDiskModal({ vm, onCancel, onSubmitted }: VmCreateDiskModalProps) {
  const [form] = Form.useForm<VmCreateDiskFormValues>();
  const mutation = useVMMutation<VmCreateDiskFormValues>({
    vmId: vm.id,
    action: "创建数据盘",
    actionId: "vm-disk-create",
    refreshQueryKeys: [["vms", vm.id, "disks"]],
    onSubmitted,
    mutationFn: (values) =>
      createVmDisk(vm.id, {
        expected_version: vm.version,
        name: values.name.trim(),
        size_bytes: capacityToBytes(values.sizeGib, "GiB").toString(),
      }),
  });
  return (
    <Modal
      visible
      title={`创建数据盘 · ${vm.name}`}
      confirmLoading={mutation.isPending}
      okButtonProps={{ disabled: vmIsClosed(vm) || mutation.busy }}
      onCancel={onCancel}
      onOk={async () => {
        if (mutation.busy || vmIsClosed(vm)) return;
        await mutation.mutateAsync(await validateForm(form));
      }}
    >
      <Form form={form} layout="vertical" initialValues={{ sizeGib: 10 }}>
        <Form.Item
          field="name"
          label="名称"
          rules={[
            { required: true, message: "请输入数据盘名称" },
            {
              validator: (value, callback) => {
                if (!value?.trim()) callback("请输入数据盘名称");
              },
            },
          ]}
        >
          <Input maxLength={128} />
        </Form.Item>
        <Form.Item
          field="sizeGib"
          label="容量"
          rules={[
            { required: true, message: "请输入数据盘容量" },
            {
              validator: (value, callback) =>
                callback(
                  Number.isSafeInteger(value) && value >= 1 && value <= MAX_CAPACITY_GIB
                    ? undefined
                    : `容量须为 1–${MAX_CAPACITY_GIB} GiB 之间的整数`,
                ),
            },
          ]}
        >
          <InputNumber min={1} max={MAX_CAPACITY_GIB} precision={0} suffix="GiB" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
