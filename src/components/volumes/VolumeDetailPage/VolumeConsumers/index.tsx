import { Button, Empty } from "@arco-design/web-react";
import type { StorageVolumeConsumer } from "@/api/storage/volumes";
import { DataTable } from "@/components/common";
type VolumeConsumersProps = { consumers: StorageVolumeConsumer[]; consumersKnown: boolean };
export default function VolumeConsumers({ consumers, consumersKnown }: VolumeConsumersProps) {
  // TODO(storage-migration): consumers 只包含工作负载身份，旧挂载/卸载实现保留在 VolumeRelatedResources，不能伪造实例 ID。
  return (
    <DataTable<StorageVolumeConsumer>
      header={{ title: "关联实例", extra: <Button disabled>挂载</Button> }}
      rowKey={(item) => JSON.stringify([item.kind, item.namespace, item.name])}
      columns={[
        { title: "实例名称", width: 200, dataIndex: "name", ellipsis: true },
        { title: "实例类型", width: 140, dataIndex: "kind" },
        { title: "命名空间", width: 200, dataIndex: "namespace", ellipsis: true },
      ]}
      data={consumers}
      noDataElement={consumersKnown ? undefined : <Empty description="使用方状态未知" />}
      pagination={false}
    />
  );
}
