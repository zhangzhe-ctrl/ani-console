import type { VmImage } from "@/api/vm-images";
import { StatusBadge } from "@/components/common";
import { VM_IMAGE_REASONS, VM_IMAGE_STATES } from "../options";

export default function VmImageStatus({ image }: { image: VmImage }) {
  const appearance = VM_IMAGE_STATES[image.state];
  const reason =
    image.cleanupState === "BLOCKED"
      ? VM_IMAGE_REASONS.NATIVE_CLEANUP_BLOCKED
      : image.reason
        ? VM_IMAGE_REASONS[image.reason]
        : undefined;

  return (
    <StatusBadge
      status={image.state}
      tone={appearance?.tone}
      loading={appearance?.loading}
      reason={reason}
    >
      {appearance?.label ?? "未知状态"}
    </StatusBadge>
  );
}
