navbar.ts
import { navbar } from "vuepress-theme-hope";

export default navbar([
  "/",
  {
    text: "博文",
    icon: "pen-to-square",
    prefix: "/posts/",
    children: [
      {
        text: "linux",
        icon: "pen-to-square",
        prefix: "linux/",
        children: [
          { text: "Linux命令", icon: "pen-to-square", link: "Linux命令" },
        ],
      },
      {
        text: "docker",
        icon: "pen-to-square",
        prefix: "docker/",
        children: [
          { text: "容器化技术docker", icon: "pen-to-square", link: "容器化技术Docker" },
        ],
      },
      {
        text: "redis",
        icon: "pen-to-square",
        prefix: "redis/",
        children: [
          { text: "Redis", icon: "pen-to-square", link: "Redis" },
        ],
      },
    ],
  },
  // {
  //   text: "V2 文档",
  //   icon: "book",
  //   link: "https://theme-hope.vuejs.press/zh/",
  // },
]);