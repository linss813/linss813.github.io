import { defineUserConfig } from "vuepress";
import { getDirname, path } from "@vuepress/utils"; // 必须引入此工具
import theme from "./theme.js";

const __dirname = getDirname(import.meta.url);

export default defineUserConfig({
  base: "/", // 你的域名是根路径，此处保持 "/"

  lang: "zh-CN",
  title: "十三月",
  description: "linss813",

  // 核心修改：将公共资源目录指向 src/public（不再是隐藏文件夹）
  // 这样 Obsidian 就能直接识别并选择它了
  public: path.resolve(__dirname, "../public"), 

  theme,
});