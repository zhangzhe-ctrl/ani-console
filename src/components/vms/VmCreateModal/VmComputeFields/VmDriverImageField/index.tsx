import { Form, Select } from "@arco-design/web-react";

export type VmDriverImageOption = { value: string; label: string; disabled: boolean };

type VmDriverImageFieldProps = {
  options: VmDriverImageOption[];
  loading: boolean;
  hasSystemMedia: boolean;
};

export default function VmDriverImageField({
  options,
  loading,
  hasSystemMedia,
}: VmDriverImageFieldProps) {
  return (
    <Form.Item
      field="driver_media_key"
      label="驱动镜像（ISO）"
      formatter={(key: string | undefined) => key || undefined}
      rules={[
        {
          validator: (key: string | undefined, callback) =>
            callback(
              key && !options.some((option) => option.value === key && !option.disabled)
                ? "所选驱动镜像与系统介质不兼容或已不可用，请重新选择"
                : undefined,
            ),
        },
      ]}
    >
      <Select
        aria-label="驱动镜像（ISO）"
        allowClear
        disabled={!hasSystemMedia}
        loading={loading}
        filterOption={false}
        placeholder={hasSystemMedia ? "请选择驱动镜像（可选）" : "请先选择系统介质"}
        options={options}
      />
    </Form.Item>
  );
}
