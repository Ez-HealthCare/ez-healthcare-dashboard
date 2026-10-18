"use client";

import { ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import type { PropsWithChildren } from "react";

import { APP_THEME } from "@/lib/constants/theme";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ConfigProvider locale={viVN} theme={APP_THEME}>
      {children}
    </ConfigProvider>
  );
}
