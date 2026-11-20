import { useRef } from "react";
import { Form, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateDataset, type Dataset, type UpdateDatasetInput } from "@/api/modeldev";
import { validateForm } from "@/lib/form";
import { showMessage } from "@/lib/feedback";
import DatasetMetadataFields from "../DatasetMetadataFields";

type EditDatasetModalProps = { dataset: Dataset; onCancel: () => void };
type EditDatasetFormValues = { name: string; description: string };

export default function EditDatasetModal({ dataset, onCancel }: EditDatasetModalProps) {
  const [form] = Form.useForm<EditDatasetFormValues>();
  const submitting = useRef(false);
  const qc = useQueryClient();
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["datasets"] }),
      qc.invalidateQueries({ queryKey: ["dataset", dataset.dataset_id] }),
      qc.invalidateQueries({ queryKey: ["dataset-versions", dataset.dataset_id] }),
      qc.invalidateQueries({ queryKey: ["dataset-operations", dataset.dataset_id] }),
    ]);
  const update = useMutation({
    mutationFn: (input: UpdateDatasetInput) => updateDataset(dataset.dataset_id, input),
    meta: { feedback: { channel: "message", action: "保存数据集", successText: "数据集已保存" } },
    onSuccess: async () => {
      await refresh();
      onCancel();
    },
  });
  const submit = async () => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const values = await validateForm<EditDatasetFormValues>(form);
      // 只提交与打开表单时不同的字段。
      const name = values.name !== dataset.name ? values.name : undefined;
      const description =
        values.description !== dataset.description ? values.description : undefined;
      if (name === undefined && description === undefined) {
        showMessage({ type: "info", content: "没有需要保存的修改" });
        return;
      }
      await update.mutateAsync({
        expected_revision: dataset.revision,
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
      });
    } catch {
      // 校验与提交错误使用统一反馈，保留表单。
    } finally {
      submitting.current = false;
    }
  };
  return (
    <Modal
      visible
      title="编辑数据集"
      onCancel={onCancel}
      onOk={submit}
      confirmLoading={update.isPending}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ name: dataset.name, description: dataset.description }}
        disabled={update.isPending}
      >
        <DatasetMetadataFields allowEmptyDescription={!dataset.description} />
      </Form>
    </Modal>
  );
}
