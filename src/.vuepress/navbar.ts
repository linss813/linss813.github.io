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
      // { text: "樱桃", icon: "pen-to-square", link: "cherry" },
    ],
  },
  // {
  //   text: "V2 文档",
  //   icon: "book",
  //   link: "https://theme-hope.vuejs.press/zh/",
  // },
]);
