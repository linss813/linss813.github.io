import { defineUserConfig } from "vuepress";
import { getDirname, path } from "@vuepress/utils";
import theme from "./theme.js";

const __dirname = getDirname(import.meta.url);

export default defineUserConfig({
  // 1. 基础配置
  base: "/", 
  lang: "zh-CN",
  title: "十三月",
  description: "linss813",

  // 2. 保持默认公共资源目录 (src/.vuepress/public)
  // 这样你原来的 Logo、Favicon 等静态资源路径不需要变动
  public: path.resolve(__dirname, "public"),

  // 3. 配置路径别名，确保 Web 端能识别 src/assets
  alias: {
    // 别名配置：将 Markdown 中的 @assets 指向你的 Obsidian 附件目录
    "@assets": path.resolve(__dirname, "../assets"),
  },

  theme,

  // 4. 增强 Markdown 对相对路径图片的处理
  // VuePress Theme Hope 会自动将这种相对路径的图片打包并部署
  markdown: {
    headers: {
      level: [2, 3, 4],
    },
  },
});