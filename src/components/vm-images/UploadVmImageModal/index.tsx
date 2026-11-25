import { useEffect, useRef, useState } from "react";
import { Form, Modal, Progress, Typography } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createVmImage,
  uploadVmImageFile,
  waitForVmImageReady,
  type VmImage,
  type VmImageKind,
  type VmImageOS,
  type VmImageUploadPhase,
} from "@/api/vm-images";
import { capacityToBytes } from "@/lib/capacity";
import { validateForm } from "@/lib/form";
import VmImageFileSelect from "../VmImageFileSelect";
import VmImageFormFields from "../VmImageFormFields";

interface UploadVmImageModalProps {
  image?: VmImage;
  onCancel: () => void;
  onSubmitted: () => void;
}

interface UploadVmImageFormValues {
  name: string;
  kind: VmImageKind;
  osFamily: VmImageOS["osFamily"];
  osVersion: string;
  sourceCapacityGib: string;
  supportsCloudInit?: boolean;
  file: File;
}

export default function UploadVmImageModal({
  image,
  onCancel,
  onSubmitted,
}: UploadVmImageModalProps) {
  const [form] = Form.useForm<UploadVmImageFormValues>();
  const client = useQueryClient();
  const controller = useRef<AbortController | null>(null);
  const submitted = useRef(false);
  const target = useRef(image);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [registered, setRegistered] = useState(Boolean(image));
  const [phase, setPhase] = useState<VmImageUploadPhase>("preparing");
  const [percent, setPercent] = useState(0);
  useEffect(() => () => controller.current?.abort(), []);
  const upload = useMutation({
    retry: false,
    meta: {
      feedback: {
        channel: "message",
        action: "上传镜像",
        successText: "镜像已可用",
        errorFallback: "镜像上传失败",
      },
    },
    mutationFn: async (values: UploadVmImageFormValues) => {
      const current = new AbortController();
      controller.current = current;
      let fileSent = fileUploaded;
      setPhase(fileSent ? "uploading" : "preparing");
      setPercent(fileSent ? 100 : 0);
      try {
        if (!target.current) {
          target.current = await createVmImage(
            {
              name: values.name.trim(),
              kind: values.kind,
              format: values.kind === "DISK_IMAGE" ? "qcow2" : "iso",
              source_capacity_bytes:
                values.kind === "DRIVER_ISO"
                  ? String(values.file.size)
                  : capacityToBytes(values.sourceCapacityGib, "GiB").toString(),
              initialization_capability:
                values.kind === "DISK_IMAGE" &&
                values.osFamily === "linux" &&
                values.supportsCloudInit
                  ? "CLOUD_INIT_NOCLOUD"
                  : undefined,
              // FIXME: 后端允许驱动镜像省略 os_version 后，移除对应表单项和提交值。
              os: { os_family: values.osFamily, os_version: values.osVersion.trim() },
            },
            values.file,
            current.signal,
          );
          setRegistered(true);
          await client.invalidateQueries({ queryKey: ["vm-images", "list"] });
        }
        const { imageId } = target.current;
        if (!fileSent) {
          await uploadVmImageFile({
            imageId,
            file: values.file,
            signal: current.signal,
            onPhase: setPhase,
            onProgress: setPercent,
          });
          fileSent = true;
          setFileUploaded(true);
          setPhase("uploading");
          setPercent(100);
        }
        await waitForVmImageReady(imageId, current.signal);
      } catch (error) {
        if (current.signal.aborted) {
          throw new Error(
            fileSent ? "已停止查询导入状态，可稍后在列表查看" : "镜像上传已取消，可从列表继续上传",
          );
        }
        throw error;
      } finally {
        controller.current = null;
      }
    },
    onSuccess: async () => {
      onSubmitted();
      await client.invalidateQueries({ queryKey: ["vm-media"] });
    },
    onSettled: () => client.invalidateQueries({ queryKey: ["vm-images", "list"] }),
  });
  const submit = async () => {
    if (submitted.current) return;
    submitted.current = true;
    try {
      await upload.mutateAsync(await validateForm(form));
    } finally {
      submitted.current = false;
    }
  };
  return (
    <Modal
      visible
      title={image ? "上传镜像文件" : "添加镜像"}
      style={{ width: 600 }}
      okText={fileUploaded ? "确认导入结果" : registered ? "上传文件" : "开始上传"}
      cancelText={upload.isPending ? "取消上传" : "取消"}
      confirmLoading={upload.isPending}
      closable={!upload.isPending}
      escToExit={!upload.isPending}
      maskClosable={!upload.isPending}
      onCancel={() => {
        if (upload.isPending) controller.current?.abort();
        else onCancel();
      }}
      onOk={submit}
    >
      <Form
        form={form}
        layout="vertical"
        disabled={upload.isPending}
        initialValues={{
          kind: image?.kind ?? "DISK_IMAGE",
          osFamily: "linux",
          supportsCloudInit: false,
        }}
        onValuesChange={(_, values) => {
          if (
            values.supportsCloudInit &&
            (values.kind !== "DISK_IMAGE" || values.osFamily !== "linux")
          ) {
            form.setFieldValue("supportsCloudInit", false);
          }
        }}
      >
        {image ? (
          <Typography.Paragraph>镜像：{image.name}</Typography.Paragraph>
        ) : (
          <VmImageFormFields disabled={upload.isPending || registered} />
        )}
        <Form.Item
          field="file"
          label="镜像文件"
          required
          rules={[
            {
              validator: (file: File | undefined, callback) =>
                callback(!file ? "请选择镜像文件" : !file.size ? "不能上传空文件" : undefined),
            },
          ]}
        >
          <VmImageFileSelect disabled={upload.isPending || fileUploaded} />
        </Form.Item>
        {upload.isPending ? (
          <div className="flex flex-col gap-2" aria-live="polite">
            <Typography.Text>
              {phase === "preparing"
                ? "正在准备上传目标…"
                : percent < 100
                  ? "正在上传文件…"
                  : "文件已发送，正在确认上传结果…"}
            </Typography.Text>
            {phase === "uploading" ? <Progress percent={percent} /> : null}
          </div>
        ) : registered && !image ? (
          <Typography.Paragraph type="secondary">
            {fileUploaded
              ? "文件已发送，再次提交将查询导入状态。"
              : "镜像记录已创建，再次提交将继续上传文件。"}
          </Typography.Paragraph>
        ) : null}
      </Form>
    </Modal>
  );
}
