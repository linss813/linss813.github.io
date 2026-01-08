import { defineUserConfig } from "vuepress";

import theme from "./theme.js";

export default defineUserConfig({
  base: "/",

  lang: "zh-CN",
  title: "十三月",
  description: "linss813",

  theme,

  // 和 PWA 一起启用
  // shouldPrefetch: false,
});
