import { useState } from "react";
import { Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteVmImage, type VmImage } from "@/api/vm-images";
import type { RowAction } from "@/components/common";
import EditVmImageModal from "@/components/vm-images/EditVmImageModal";
import UploadVmImageModal from "@/components/vm-images/UploadVmImageModal";
import { isDateTimeExpired } from "@/lib/date";

type VmImageActionDialog = { action: "edit" | "upload"; image: VmImage };

export function useVmImageActions() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<VmImageActionDialog>();
  const remove = useMutation({
    mutationFn: (image: VmImage) =>
      deleteVmImage(image.imageId, { expected_version: image.version }),
    meta: {
      feedback: {
        channel: "notification",
        id: "vm-image-delete",
        action: "删除镜像",
        successText: "镜像删除已提交",
      },
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vm-images", "list"] }),
  });

  const canModify = (image: VmImage) => image.state !== "DELETING" && image.state !== "DELETED";
  const actions: RowAction<VmImage>[] = [
    {
      key: "edit",
      label: "编辑",
      visible: canModify,
      onClick: (image) => setDialog({ action: "edit", image }),
    },
    {
      key: "upload",
      label: "上传文件",
      visible: (image) =>
        (image.state === "PREPARING" || image.state === "IMPORTING") &&
        !isDateTimeExpired(image.uploadDeadline),
      onClick: (image) => setDialog({ action: "upload", image }),
    },
    {
      key: "delete",
      label: "删除",
      intent: "danger",
      visible: canModify,
      disabled: () => remove.isPending,
      onClick: (image) => {
        Modal.confirm({
          title: "删除镜像",
          content: `确定删除镜像“${image.name}”？这会同时删除镜像的源存储。`,
          okButtonProps: { status: "danger" },
          onOk: () => remove.mutateAsync(image),
        });
      },
    },
  ];

  const closeDialog = () => setDialog(undefined);
  const dialogNode = dialog ? (
    dialog.action === "edit" ? (
      <EditVmImageModal image={dialog.image} onCancel={closeDialog} />
    ) : (
      <UploadVmImageModal image={dialog.image} onCancel={closeDialog} onSubmitted={closeDialog} />
    )
  ) : null;

  return { actions, dialogNode };
}
