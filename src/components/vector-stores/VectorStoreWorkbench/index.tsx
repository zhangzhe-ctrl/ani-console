import {
  searchVectorStore,
  type VectorStore,
  type VectorStoreSearchHit,
} from "@/api/storage/vector-stores";
import { DataTable } from "@/components/common";
import { Alert, Button, Form, Input, InputNumber, Typography } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

type VectorStoreWorkbenchProps = { store: VectorStore };

type SearchHit = VectorStoreSearchHit & { content: string };

function buildEmptyVector(dimension: number) {
  return Array.from({ length: dimension }, () => "0").join(", ");
}

export default function VectorStoreWorkbench({ store }: VectorStoreWorkbenchProps) {
  const { id, dimension } = store;
  const [vectorSource, setVectorSource] = useState({ id, dimension });
  const [searchVector, setSearchVector] = useState(() => buildEmptyVector(dimension));
  const [topK, setTopK] = useState(10);
  const [filterKey, setFilterKey] = useState("");
  const [filterValue, setFilterValue] = useState("");

  if (vectorSource.id !== id || !Object.is(vectorSource.dimension, dimension)) {
    setVectorSource({ id, dimension });
    setSearchVector(buildEmptyVector(dimension));
  }

  const search = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "vector-search",
        action: "检索",
        errorFallback: "检索失败",
      },
    },
    mutationFn: async () => {
      const vector = searchVector.split(",").map((value) => Number.parseFloat(value.trim()));
      if (vector.some(Number.isNaN)) throw new Error("查询向量必须为以逗号分隔的数字");
      if (vector.length !== store.dimension) {
        throw new Error(`查询向量长度必须为 ${store.dimension}，当前为 ${vector.length}`);
      }

      const normalizedFilterKey = filterKey.trim();
      const normalizedFilterValue = filterValue.trim();
      if (Boolean(normalizedFilterKey) !== Boolean(normalizedFilterValue)) {
        throw new Error("请同时填写过滤键和值");
      }

      return searchVectorStore(store.id, {
        vector,
        top_k: topK,
        filter: normalizedFilterKey ? { [normalizedFilterKey]: normalizedFilterValue } : undefined,
      });
    },
  });

  const hits = (search.data?.items ?? []) as SearchHit[];

  return (
    <div className="space-y-6">
      <Alert type="info" showIcon content={`请输入长度为 ${store.dimension} 的查询向量。`} />

      <Form layout="vertical">
        <Form.Item
          label="查询向量"
          required
          extra={`长度须为 ${store.dimension}，与创建时的向量维度一致。`}
        >
          <Input.TextArea
            aria-required="true"
            value={searchVector}
            onChange={setSearchVector}
            autoSize={{ minRows: 4, maxRows: 8 }}
            placeholder="使用英文逗号分隔每个数值"
          />
        </Form.Item>

        <Form.Item label="返回条数" className="max-w-40">
          <InputNumber
            value={topK}
            min={1}
            max={100}
            precision={0}
            onChange={(value) => setTopK(Number(value ?? 10))}
          />
        </Form.Item>

        <div className="mb-4">
          <Typography.Title heading={6} className="mb-3! mt-0!">
            过滤
          </Typography.Title>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Form.Item label="键" className="mb-0!">
              <Input value={filterKey} onChange={setFilterKey} placeholder="可选，如 source" />
            </Form.Item>
            <Form.Item label="值" className="mb-0!">
              <Input
                value={filterValue}
                onChange={setFilterValue}
                placeholder="可选，如 runbook.md"
              />
            </Form.Item>
          </div>
          <Typography.Text type="secondary" className="mt-2 block text-sm">
            仅支持键值匹配，不支持表达式。
          </Typography.Text>
        </div>

        <div className="flex justify-end">
          <Button type="primary" loading={search.isPending} onClick={() => search.mutateAsync()}>
            执行检索
          </Button>
        </div>
      </Form>

      {search.data ? (
        <section>
          <DataTable<SearchHit>
            header={{
              title: "检索结果",
              extra: (
                <Typography.Text type="secondary">
                  {search.data.total ?? hits.length} 条
                </Typography.Text>
              ),
            }}
            columns={[
              { title: "ID", dataIndex: "id", width: 160, ellipsis: true },
              {
                title: "相关度",
                dataIndex: "score",
                width: 120,
                render: (score) => (
                  <Typography.Text style={{ color: "var(--color-primary-6)" }} bold>
                    {Number(score).toFixed(2)}
                  </Typography.Text>
                ),
              },
              { title: "内容", width: 400, dataIndex: "content", ellipsis: true },
              {
                title: "来源",
                width: 180,
                ellipsis: true,
                render: (_, hit) => hit.metadata?.source || "-",
              },
            ]}
            data={hits}
            pagination={false}
            tableLabel="向量检索结果"
          />
        </section>
      ) : null}
    </div>
  );
}
