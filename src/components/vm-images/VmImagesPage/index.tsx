import { useState } from "react";
import { Select } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { listVmImages, type VmImage, type VmImageKind, type VmImageState } from "@/api/vm-images";
import {
  ListDataTable,
  ListPageFrame,
  ResourceIdentity,
  type ListColumn,
} from "@/components/common";
import { useListPagination } from "@/hooks/useListPagination";
import { useVmImageActions } from "@/hooks/useVmImageActions";
import CapacityText from "@/components/common/CapacityText";
import { formatDateTime } from "@/lib/format";
import { withId } from "@/lib/id";
import UploadVmImageModal from "../UploadVmImageModal";
import VmImageStatus from "../VmImageStatus";
import { VM_IMAGE_KINDS, VM_IMAGE_STATES } from "../options";

export default function VmImagesPage() {
  const [status, setStatus] = useState<VmImageState | "all">("all");
  const [kind, setKind] = useState<VmImageKind | "">("");
  const [searchText, setSearchText] = useState("");
  const [adding, setAdding] = useState(false);
  const state = status === "all" ? undefined : status;
  const keyword = searchText.trim() || undefined;
  const { page, pageSize, setPage, setPageSize } = useListPagination(
    withId("vm-images", status, kind, keyword),
    20,
  );
  const query = useQuery({
    queryKey: ["vm-images", "list", { page, pageSize, state, kind, keyword }],
    queryFn: ({ signal }) =>
      listVmImages({ page, pageSize, state, kind: kind || undefined, keyword }, signal),
    meta: { errorNotification: { id: "vm-images", action: "虚拟机镜像列表加载" } },
  });
  const { actions, dialogNode } = useVmImageActions();
  const statusTabs: Array<{ value: VmImageState | "all"; label: string }> = [
    { value: "all", label: "全部" },
    { value: "PREPARING", label: VM_IMAGE_STATES.PREPARING.label },
    { value: "IMPORTING", label: VM_IMAGE_STATES.IMPORTING.label },
    { value: "READY", label: VM_IMAGE_STATES.READY.label },
    { value: "FAILED", label: VM_IMAGE_STATES.FAILED.label },
    { value: "UNAVAILABLE", label: VM_IMAGE_STATES.UNAVAILABLE.label },
    { value: "DELETING", label: VM_IMAGE_STATES.DELETING.label },
  ];
  const columns: ListColumn<VmImage>[] = [
    {
      key: "name",
      title: "名称 / ID",
      width: 200,
      fixed: "left",
      render: (_, image) => (
        <ResourceIdentity name={image.name} id={image.imageId} openable={false} />
      ),
    },
    {
      key: "kind",
      title: "镜像类型",
      width: 160,
      render: (_, image) => VM_IMAGE_KINDS[image.kind],
    },
    {
      key: "os",
      title: "操作系统",
      width: 180,
      ellipsis: true,
      render: (_, image) =>
        `${image.os.osFamily === "windows" ? "Windows" : "Linux"} ${image.os.osVersion}`,
    },
    {
      key: "architecture",
      title: "架构",
      dataIndex: "os.architecture",
      width: 120,
      ellipsis: true,
    },
    {
      key: "state",
      title: "状态",
      width: 120,
      render: (_, image) => <VmImageStatus image={image} />,
    },
    {
      key: "source_capacity_bytes",
      title: "源卷容量",
      width: 160,
      render: (_, image) => <CapacityText bytes={image.source_capacity_bytes} />,
    },
    {
      key: "createdAt",
      title: "创建时间",
      width: 180,
      render: (_, image) => formatDateTime(image.createdAt),
    },
  ];
  return (
    <ListPageFrame
      header={{
        iconClassName: "icon-yunzhuji",
        title: "虚拟机镜像",
        subtitle: "查看虚拟机镜像的操作系统、架构、状态和容量",
        actions: [
          {
            key: "add-vm-image",
            label: "添加镜像",
            variant: "primary",
            iconClassName: "icon-add-1",
            onClick: () => setAdding(true),
          },
        ],
      }}
      tabs={{ items: statusTabs, value: status, onChange: setStatus }}
      toolbar={{
        search: {
          fields: [{ value: "keyword", label: "关键词" }],
          field: "keyword",
          value: searchText,
          placeholder: "搜索虚拟机镜像",
          onFieldChange: () => undefined,
          onChange: setSearchText,
        },
        filters: (
          <Select
            aria-label="镜像类型筛选"
            style={{ width: 176, flexShrink: 0 }}
            value={kind}
            onChange={setKind}
            options={[
              { value: "", label: "全部类型" },
              { value: "DISK_IMAGE", label: VM_IMAGE_KINDS.DISK_IMAGE },
              { value: "INSTALL_ISO", label: VM_IMAGE_KINDS.INSTALL_ISO },
            ]}
          />
        ),
        refresh: {
          spinning: query.isRefetching,
          onClick: () => {
            query.refetch();
          },
        },
      }}
    >
      <ListDataTable
        data={query.data?.items ?? []}
        columns={columns}
        rowActions={actions}
        rowKey="imageId"
        loading={query.isFetching}
        tableLabel="虚拟机镜像列表"
        pagination={{
          page,
          pageSize,
          total: Number(query.data?.total ?? "0"),
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
      />
      {adding ? (
        <UploadVmImageModal
          onCancel={() => setAdding(false)}
          onSubmitted={() => {
            setPage(1);
            setAdding(false);
          }}
        />
      ) : null}
      {dialogNode}
    </ListPageFrame>
  );
}
