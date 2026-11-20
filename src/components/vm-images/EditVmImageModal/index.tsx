import { useRef } from "react";
import { Form, Input, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateVmImage, type UpdateVmImageInput, type VmImage } from "@/api/vm-images";
import { showMessage } from "@/lib/feedback";
import { validateForm } from "@/lib/form";

interface EditVmImageModalProps {
  image: VmImage;
  onCancel: () => void;
}

interface EditVmImageFormValues {
  name: string;
  description?: string;
}

export default function EditVmImageModal({ image, onCancel }: EditVmImageModalProps) {
  const [form] = Form.useForm<EditVmImageFormValues>();
  const client = useQueryClient();
  const submitting = useRef(false);
  const update = useMutation({
    mutationFn: (input: UpdateVmImageInput) => updateVmImage(image.imageId, input),
    meta: { feedback: { channel: "message", action: "更新镜像", successText: "镜像已更新" } },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["vm-images", "list"] });
      onCancel();
    },
  });

  const submit = async () => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const values = await validateForm<EditVmImageFormValues>(form);
      const name = values.name.trim();
      const description = values.description ?? "";
      const input: UpdateVmImageInput = { expected_version: image.version };
      if (name !== image.name) input.name = name;
      if (description !== (image.description ?? "")) input.description = description;
      if (input.name === undefined && input.description === undefined) {
        showMessage({ type: "info", content: "没有需要保存的修改" });
        return;
      }
      await update.mutateAsync(input);
    } catch {
      // 表单校验和提交错误由统一反馈处理。
    } finally {
      submitting.current = false;
    }
  };

  return (
    <Modal
      visible
      title="编辑镜像"
      okText="保存"
      onOk={submit}
      onCancel={onCancel}
      confirmLoading={update.isPending}
      cancelButtonProps={{ disabled: update.isPending }}
      closable={!update.isPending}
      escToExit={!update.isPending}
      maskClosable={!update.isPending}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ name: image.name, description: image.description ?? "" }}
        disabled={update.isPending}
      >
        <Form.Item
          field="name"
          label="镜像名称"
          required
          rules={[
            {
              validator: (value: string | undefined, callback) =>
                callback(
                  !value?.trim()
                    ? "请输入镜像名称"
                    : [...value.trim()].length > 80
                      ? "镜像名称最多 80 个字符"
                      : undefined,
                ),
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          field="description"
          label="描述"
          rules={[
            {
              validator: (value: string | undefined, callback) =>
                callback([...(value ?? "")].length > 512 ? "描述最多 512 个字符" : undefined),
            },
          ]}
        >
          <Input.TextArea placeholder="选填" autoSize={{ minRows: 2, maxRows: 4 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
