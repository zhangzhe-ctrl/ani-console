import { ConfigProvider, Modal, type ConfigProviderProps } from "@arco-design/web-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { useAuthSession } from "@/hooks/useAuthSession";
import { showMessage } from "@/lib/feedback";
import { queryClient } from "@/lib/query-client";
import { router } from "@/router";

const ARCO_THEME = { primaryColor: "#0079D3" };

const ARCO_COMPONENT_CONFIG = {
  Form: {
    onSubmitFailed: () => showMessage({ type: "error", content: "请检查并修正表单中的错误项" }),
  },
  Modal: {
    maskClosable: false,
    getChildrenPopupContainer: (node) => {
      // 挂到正文外、焦点范围内，避免子弹出层被正文滚动区域裁切。
      const content = node.closest(".arco-modal")?.querySelector(".arco-modal-content");
      return content?.parentElement ?? node.ownerDocument.body;
    },
  },
  Trigger: {
    updateOnScroll: true,
  },
  Select: {
    triggerProps: {
      autoAlignPopupWidth: false,
      autoAlignPopupMinWidth: true,
      position: "bl",
    },
  },
  Table: {
    placeholder: "-",
  },
} satisfies ConfigProviderProps["componentConfig"];

Modal.config({ simple: false });

export function App() {
  const authReady = useAuthSession();

  return (
    <ConfigProvider theme={ARCO_THEME} componentConfig={ARCO_COMPONENT_CONFIG}>
      {authReady && (
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      )}
    </ConfigProvider>
  );
}
