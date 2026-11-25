import { useEffect, useState } from "react";
import {
  streamInferenceLogs,
  type InferenceLogLine,
  type InferenceLogParams,
} from "@/api/inference";
import { closeNotification, showNotification } from "@/lib/feedback";
import { withId } from "@/lib/id";
import { readInferenceLogStream } from "./stream";

type InferenceLogStreamOptions = {
  serviceId: string;
  params: InferenceLogParams;
  enabled: boolean;
};
type StreamStatus = "idle" | "connecting" | "connected";
type LogStreamState = { scope: string; lines: InferenceLogLine[]; status: StreamStatus };
export const INFERENCE_LOG_LIMIT = 1000;

export function useInferenceLogStream({ serviceId, params, enabled }: InferenceLogStreamOptions) {
  const { instance, container, since, until, tail_lines, level } = params;
  const scope = JSON.stringify([
    serviceId,
    instance,
    container,
    since,
    until,
    tail_lines,
    level,
    enabled,
  ]);
  const initialStatus = enabled && typeof AbortController !== "undefined" ? "connecting" : "idle";
  const [state, setState] = useState<LogStreamState>({ scope, lines: [], status: initialStatus });
  if (state.scope !== scope) {
    setState({
      scope,
      status: initialStatus,
      lines: initialStatus === "connecting" ? [] : state.lines,
    });
  }

  useEffect(() => {
    if (!enabled) return;
    const notificationId = withId("inference-log-stream", serviceId);
    if (typeof AbortController === "undefined") {
      showNotification({
        id: notificationId,
        state: "error",
        action: "推理日志连接",
        content: "当前浏览器不支持实时日志连接",
      });
      return;
    }
    const controller = new AbortController();
    const setStatus = (status: StreamStatus) => {
      setState((current) => (current.scope === scope ? { ...current, status } : current));
    };
    async function connect() {
      try {
        const stream = await streamInferenceLogs(
          serviceId,
          { instance, container, since, until, tail_lines, level },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        closeNotification(notificationId);
        setStatus("connected");
        await readInferenceLogStream(stream, controller.signal, (line) => {
          if (controller.signal.aborted) return;
          setState((current) =>
            current.scope === scope
              ? { ...current, lines: [...current.lines, line].slice(-INFERENCE_LOG_LIMIT) }
              : current,
          );
        });
      } catch (error) {
        if (!controller.signal.aborted)
          showNotification({
            id: notificationId,
            state: "error",
            action: "推理日志连接",
            content: { error, fallback: "推理日志连接失败" },
          });
      } finally {
        if (!controller.signal.aborted) setStatus("idle");
      }
    }
    connect();
    // 切换 Tab、服务或筛选时取消请求和 reader；不自动重连，以免重复回放历史日志。
    return () => controller.abort();
  }, [serviceId, instance, container, since, until, tail_lines, level, enabled, scope]);
  return { lines: state.lines, status: state.status };
}
