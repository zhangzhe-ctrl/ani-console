import { Alert, Form, InputNumber, Modal, Typography } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { expandVolume, type StorageVolume } from "@/api/storage/volumes";
import CapacityText from "@/components/common/CapacityText";
import { capacityToBytes, MAX_CAPACITY_GIB, nextWholeCapacityGib } from "@/lib/capacity";
import { validateForm } from "@/lib/form";
type ExpandStorageVolumeModalProps = { volume: StorageVolume; onCancel: () => void };
type ExpandStorageVolumeFormValues = { capacityGib: number };
export default function ExpandStorageVolumeModal({
  volume,
  onCancel,
}: ExpandStorageVolumeModalProps) {
  const [form] = Form.useForm<ExpandStorageVolumeFormValues>();
  const queryClient = useQueryClient();
  const currentCapacity = BigInt(volume.requested_capacity_bytes);
  const minimumGib = nextWholeCapacityGib(currentCapacity);
  const expand = useMutation({
    meta: { feedback: { channel: "message", action: "扩容块存储卷", successText: "扩容已提交" } },
    mutationFn: ({ capacityGib }: ExpandStorageVolumeFormValues) =>
      expandVolume(volume.pvc_name, {
        expected_uid: volume.uid,
        capacity_bytes: capacityToBytes(capacityGib, "GiB").toString(),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["storage", "volumes"] }),
        queryClient.invalidateQueries({ queryKey: ["storage", "volume", volume.pvc_name] }),
      ]);
      onCancel();
    },
  });
  return (
    <Modal
      visible
      title="扩容块存储卷"
      onCancel={onCancel}
      confirmLoading={expand.isPending}
      onOk={async () => expand.mutateAsync(await validateForm(form))}
    >
      <Alert
        type="info"
        showIcon
        content={
          <>
            当前申请容量 <CapacityText bytes={currentCapacity} />
            ；块存储只支持扩容，不支持缩容。
          </>
        }
      />
      <Form
        form={form}
        layout="vertical"
        className="mt-2"
        initialValues={{ capacityGib: minimumGib }}
      >
        <Form.Item
          label="新容量"
          field="capacityGib"
          required
          rules={[
            {
              validator: (value, callback) =>
                callback(
                  Number.isSafeInteger(value) &&
                    value <= MAX_CAPACITY_GIB &&
                    capacityToBytes(value, "GiB") > currentCapacity
                    ? undefined
                    : `新容量须为大于当前申请容量且不超过 ${MAX_CAPACITY_GIB} GiB 的整数`,
                ),
            },
          ]}
        >
          <InputNumber
            min={minimumGib}
            max={MAX_CAPACITY_GIB}
            precision={0}
            suffix="GiB"
            className="w-full"
          />
        </Form.Item>
        <Typography.Text type="secondary">
          扩容后请按操作系统要求扩展分区和文件系统。
        </Typography.Text>
      </Form>
    </Modal>
  );
}
