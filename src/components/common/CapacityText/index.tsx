import { formatCapacity } from "@/lib/capacity";

type CapacityTextProps = {
  bytes?: bigint | string | null;
};

export default function CapacityText({ bytes }: CapacityTextProps) {
  if (bytes == null || bytes === "") return "-";
  return <span title={`${bytes} bytes`}>{formatCapacity(bytes)}</span>;
}
