const CAPACITY_UNIT_BYTES = { GB: 1_000_000_000n, GiB: 1_073_741_824n };
const MAX_CAPACITY_BYTES = 9_223_372_036_854_775_807n;
type CapacityUnit = keyof typeof CAPACITY_UNIT_BYTES;

export const MAX_CAPACITY_GIB = Number(MAX_CAPACITY_BYTES / CAPACITY_UNIT_BYTES.GiB);

export function capacityToBytes(value: number | string, unit: CapacityUnit): bigint {
  return BigInt(value) * CAPACITY_UNIT_BYTES[unit];
}

export function nextWholeCapacityGib(bytes: bigint | string): number {
  return Number(BigInt(bytes) / CAPACITY_UNIT_BYTES.GiB) + 1;
}

export function formatCapacity(bytes: bigint | string | null | undefined): string {
  if (bytes == null || bytes === "") return "-";

  const value = BigInt(bytes);
  const unitBytes = CAPACITY_UNIT_BYTES.GiB;
  // 低于两位小数的舍入范围时，保留足以显示 1 字节的位数。
  const decimals = value > 0n && value * 100n < unitBytes / 2n ? 9 : 2;
  const scale = 10n ** BigInt(decimals);
  const scaledBytes = value * scale;
  const rounded = (scaledBytes + unitBytes / 2n) / unitBytes;
  const whole = rounded / scale;
  const fraction = (rounded % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  const amount = fraction ? `${whole}.${fraction}` : String(whole);
  return `${amount} GiB`;
}
