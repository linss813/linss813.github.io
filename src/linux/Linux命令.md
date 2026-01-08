## vim
- 编辑模式：i-向前插入，a-向后插入，o-向下插入
- 视图模式：整行选中：shift+v  
- 单字选中： ctrl+v
- 在vim中输出彩色字体
		1、在插入模式下
		2、使用ctrl+v进入特殊字符插入模式
		3、ctrl+[ ，会插入一个 \^[ （转义字符）
		4、输入[32；1m
		5、输入文本
		6、ctrl+v,ctrl+[
		7、输入[0m结束色彩输出
		8、示例：\^[ [32;1mHello, Welcome To My Home - Mystical\^[ [0m

| Ctrl + A | 光标迅速回到行首   |
| -------- | ---------- |
| Ctrl + E | 光标迅速回到行尾   |
| Ctrl + k | 删除光标到行尾的内容 |
| Ctrl + u | 删除光标到行首的内容 |
| Ctrl + y | 粘贴删除的内容    |

## grep
作⽤：⽂本搜索⼯具，根据⽤⼾指定的 “模式” 对⽬标⽂本逐⾏进⾏匹配检查；打印匹配到的⾏
模式：由正则表达式字符及⽂本字符所编写的过滤条件
```shell
grep [OPTIONS...] PATTERN [FILE...]

	面试重点
	 -rni  ---->   递归文件，显示行号。忽略大小写

# 常用选项
-E|--extended-regexp # 使用ERE，相当于egrep
-P|--perl-regexp # 支持Perl格式的正则表达式
-i|--ignore-case # 忽略字符大小写
-v|--invert-match # 显示没有被匹配上的行，即取反
-n|--line-number # 显示匹配的行号 
-q|--quiet|--silent # 静默模式，不输出任何信息，结果要从变量 $? 拿
			$?的值为0表示查到，为1则表示无
-r|--recursive # 递归目录，但不处理软链接
-m|--max-count=N # 只匹配N行，是行，不是次数，一行可能匹配两个，但是，这里是行
-c|--count # 统计匹配的行数，是行数，一行可以匹配一次到多次
-e|--regexp=PATTERN # 实现多个选项间的逻辑or关系,如：grep –e ‘cat ' -e ‘dog' file

-A|--after-context=N # 显示匹配到的字符串所在的行及其后n行
-B|--before-context=N # 显示匹配到的字符串所在的行及其前N行
-C|--context=N # 显示匹配到的字符串所在的行及其前后各N行
```
**示例**
```shell
# 从passwd中查找root用户信息 
grep root /etc/passwd
cat /etc/passwd | grep root
# 显示匹配内容的前三行    -m
grep -m 3 bin /etc/passwd
# 显示不匹配的行  -v
grep -v nologin /etc/passwd
# 不看注释行
grep -v "#" /etc/fstab
# 静默模式
grep -q root /etc/passwd
echo $?  # 输出0
# 仅显示匹配的内容  -o
grep -o root /etc/passwd
# 递归
grep -r root /etc/*
```
## sed
Sed是从⽂件或管道中读取⼀⾏，处理⼀⾏，输出⼀⾏；再读取⼀⾏，再处理⼀⾏，再输出⼀⾏，直到最后⼀⾏。
⼀次处理⼀⾏的设计模式使得sed性能很⾼，sed在读取⼤⽂件时不会出现卡顿的现象
![[assets/Pasted image 20251018163638.png]]
```shell
sed [OPTION]... [script-only-if-no-other-script] [input-file]...
# 常用选项
-n|--quiet|--silent # 不输出模式空间内容到屏幕，即不自动打印
-i[SUFFIX]|--in-place[=SUFFIX] # -i 直接修改文件，-i.bak 以.bak后缀备份源文件
-E|-r|--regexp-extended # 扩展正则表达式
-ir # 此组合不支持，及组合使用-i不能放在最前面
-ri # 支持
-i -r # 支持
-ni # 此组合危险，会清空文件
```
格式：  **sed 选项 '范围 动作' 文件**
### 范围格式

|         形式          |         示例         | 含义                                      |
| :-----------------: | :----------------: | --------------------------------------- |
|         ——          | `sed 's/a/b' file` | 处理整份的文件                                 |
|       **`N`**       |        `3d`        | 仅处理第三行                                  |
|       **`$`**       |        `$p`        | 处理最后一行                                  |
|   **`/pattern/`**   |     `/root.p`      | 匹配到root的行                               |
|      **`M,N`**      |       `2,5`        | 从第2行到第5行（包含）                            |
|     **`M,+N`**      |      `3,+4p`       | 从第三行到第7行                                |
| **`/pat1/,/pat2/`** |  `/BEGIN/,?END/p`  | 从第一次匹配到 BEGIN 的行开始,<br>到第一次匹配到 END 的行结束 |
|      **`1~2`**      |       `1~2p`       | 步长选择（奇数行）                               |
|      **`2~2`**      |       `2~2p`       | 步长选择（偶数行）                               |
>`/^$/` 
	`^` 表示“行开始
	`$` 表示“行结束
	`^$` 合起来表示：**一行中从头到尾什么都没有** → 空行
>范围可以组合：例如 `/root/,$d` 表示从匹配 root 的行开始一直删除到文件末尾。
>步长选择功能是 GNU sed 扩展，部分系统的 BSD/macOS 自带 sed 不支持。
### 动作格式
| 命令           | 作用      | 示例                                         | 说明            |
| ------------ | ------- | ------------------------------------------ | ------------- |
| **`p`**      | 打印匹配行   | `sed -n '/bash/p' file`                    | 常与 `-n` 连用    |
| **`Ip`**     | 忽略大小写打印 | `sed -n '/root/Ip' file`                   | GNU sed 扩展    |
| **`d`**      | 删除匹配行   | `sed '/nologin/d' file`                    | 删除并立即进入下一循环   |
| **`a text`** | 在行后追加   | `sed '/daemon/a ### SYSTEM USER ###' file` | 用 `\n` 可多行追加  |
| **`i text`** | 在行前插入   | `sed '/daemon/i ### SYSTEM USER ###' file` | 插入文本          |
| **`c text`** | 替换整行    | `sed '/guest/c This is a guest user' file` | 整行替换为指定文本     |
| **`w file`** | 保存匹配行   | `sed -n '/bash/w bash_users.txt' file`     | 将匹配行写入文件      |
| **`r file`** | 读入文件内容  | `sed '/guest/r newtext.txt' file`          | 在匹配行后插入新文件内容  |
| **`=`**      | 打印行号    | `sed -n '/bash/=' file`                    | 输出匹配行的行号      |
| **`!`**      | 取反匹配    | `sed '/bash/!d' file`                      | 打印不包含 bash 的行 |
### 查找替代
| 格式                   | 示例                    | 说明               |
| -------------------- | --------------------- | ---------------- |
| `s/pattern/replace/` | `s/root/admin/`       | 将 root 替换为 admin |
| 使用其它分隔符              | `s                    | /bin/bash        |
| `g`                  | `s/bash/sh/g`         | 行内全局替换           |
| `p`                  | `s/bash/sh/p`         | 打印替换成功的行         |
| `w file`             | `s/bash/sh/w out.txt` | 替换成功的行写入文件       |
| `I` 或 `i`            | `s/bash/sh/I`         | 忽略大小写替换          |
### 分组与引用
| 表达式        | 含义                 | 示例                            |
| ---------- | ------------------ | ----------------------------- |
| `\(...\)`  | 定义分组               | `s/\(bash\)/[\1]/` → `[bash]` |
| `\1`, `\2` | 引用分组内容             | `s/\(.*\):x:\(.*\)/\1(\2)/`   |
| `&`        | 引用整个匹配内容（等价于 `\0`） | `s/bash/[&]/` → `[bash]`      |

**范例**
```shell

```

## akw
报告⽣成器，格式化⽂本输出
⽬前主流发⾏版LINUX中使⽤的都是GAWK,






>语法：awk 选项 处理动作 file


```shell

```
## tree
```bash
# 查看指定目录的层级
tree -L 1 /etc
# 每个文件和目录前显示完整的相对路径
tree -f

-D  每个文件和目录前显示最新更改时间
-s  每个文件和目录前显示文件大小
-u  每个文件和目录前显示文件/目录拥有者
-p  每个文件和目录前显示权限标示

tree使用通配符筛选
tree -P pattern # 这里的pattern不支持正则表达式，仅支持通配符
[Sun Oct 15 10:33:09 26] root@rocky9:~ #tree -P 'r*.txt' /Storage/
/Storage/
└── test
├── rename.txt
└── robots.txt
1 directory, 2 files

```
> #常用通配符:
> 	匹配任意数量的字符（包括零个）。
> 	? 匹配任意一个字符。
> 	[...] 匹配方括号中的任意一个字符。
## cat 
```shell
-n|--number #对显示出的每一行进行编号

-E|--show-ends #显示行结束符$
-A|--show-all #显示所有控制符
-b|--number-nonblank # 非空行编号
-s|--squeeze-blank # 压缩连续的空行成一行
```
## head
```shell
#默认查看前10行
-n|--lines=N #指定获取前N行,N如果为负数,表示从文件头取到倒数第N前

-c|--bytes=N #指定获取前N字节
```
## tail
```shell
-n|--lines=N #指定获取后N行,如果写成+N,表示从第N行开始到文件结束

+N    # 表示从第N行开始到文件结束
-c|--bytes=N #指定获取后N字节
-f|--follow=descriptor #跟踪显示文件fd新追加的内容,常用日志监控

```
## more
```shell
# 分页读取
常用选项
-d # 在底部显示提示
-s # 压缩连续空行

常用动作
空格键 # 翻页
回车键 # 下一页
q # 退出

其他动作
!cmd # 执行命令，在查看文档的时候，执行相关的命令
h # 显示帮助
:f # 显示文件名和当前行号
= # 显示行号
```
## less
```shell
常用选项
-e #显示完成后自动退出
-N #显示行号
-s #压缩连续空行
-S #不换行显示较长的内容

查看动作
:h # 显示帮助
/string # 搜索
:!cmd # 执行命令
b # 向上翻
q # 退出
```
## export
export 是一个 Shell 内置命令，用于将一个全局变量导出到子进程环境中，使得子进程能够继承该变量。
```shell

```
## man
```shell
# 搜索某个命令的关键字
man -k keyword
# 查看特定章节的手册
man 5 passwd    # 查看 /etc/passwd 文件格式

- 方向键：上下滚动
- PageUp/PageDown：翻页
- /：搜索（如/option）
- n：跳到下一个搜索结果
- q：退出 `man` 页面
```

| 章节    | 内容                                  |
| ----- | ----------------------------------- |
| **1** | 用户命令（如 `ls`, `cp`, `grep`）          |
| **2** | 系统调用（如 `open`, `read`）              |
| **3** | C 库函数（如 `printf`, `malloc`）         |
| **4** | 设备文件（如 `/dev/null`, `/dev/sda`）     |
| **5** | 文件格式（如 `/etc/passwd`, `/etc/fstab`） |
| **6** | 游戏（很少用）                             |
| **7** | 杂项（如 `ascii`, `units`）              |
| **8** | 管理员命令（如 `fdisk`, `shutdown`）        |
## screen
```shell
# 创建一个会话
screen -S 会话名   
# 查看所有会话
screen -ls 
# 恢复某个会话：
screen -r 会话名 或 PID
# 结束会话
exit
```

| 快捷键        | 功能                                 |
| ---------- | ---------------------------------- |
| `Ctrl+A c` | 创建一个新的窗口（shell）                    |
| `Ctrl+A n` | 切换到下一个窗口                           |
| `Ctrl+A p` | 切换到上一个窗口                           |
| `Ctrl+A "` | 列出所有窗口（可视化选择）                      |
| `Ctrl+A w` | 显示窗口列表（底部）                         |
| `Ctrl+A d` | **分离会话**（detach）——退出 screen 但不中断程序 |
| `Ctrl+A k` | 关闭当前窗口（确认后）                        |
| `Ctrl+A ?` | 查看所有快捷键帮助                          |
| `Ctrl+A [` | 进入复制模式（可滚动、复制文本）                   |
## tmux
```shell
# 启动一个新会话
tmux new -s 会话名
# 列出所有会话
tmux ls
# 恢复会话
tmux attach -t 会话名
# 结束指定会话
tmux kill-session -t 会话名
# 重命名会话
tmux rename-session -t 原会话名 新会话名
# 关闭所有会话
tmux kill-server
```

| 快捷键          | 功能说明              | 使用场景                                |
| ------------ | ----------------- | ----------------------------------- |
| `Ctrl+B c`   | 创建一个**新窗口**       | 开始新任务，比如打开新 shell、运行服务              |
| `Ctrl+B n`   | 切换到**下一个窗口**      | 在多个窗口之间顺序前进                         |
| `Ctrl+B p`   | 切换到**上一个窗口**      | 顺序后退，与 `n` 配合使用                     |
| `Ctrl+B 0~9` | 直接切换到编号为 0~9 的窗口  | 快速跳转，比 `n/p` 更高效                    |
| `Ctrl+B ,`   | **重命名当前窗口**       | 给窗口起个有意义的名字，如 `logs`、`server`、`vim` |
| `Ctrl+B &`   | **关闭当前窗口**（会提示确认） | 结束一个任务或清理不用的窗口                      |
| `Ctrl+B w`   | 显示**所有窗口的可视化列表**  | 查看所有窗口，用方向键选择并进入                    |
## mkdir
```bash
语法格式：mkdir [pv] [-m mode] directory_name...

# 创建多级目录
mkdir -p dir1/dir2/dir3

#一次创建多个同级目录用空格隔开 
mkdir dir1 dir2 dir3

-v 会显示创建每个目录的详细信息
```
## enable
```bash
# 查看已启用的内部命令
enable

# 禁用某个内部命令（如time）
enable -n time

# 启用被禁用的内部命令
enable time
```
## alias
```shell
#设置别名
alias ll='ls -l'
#查看当前所有别名
alisa
#删除别名（以删除ll为例）
unalisa ll
#示例   将rm命令设置为将所有要删除的文件，移动到创建的垃圾箱目录中
alias rm='dir=/Storage/backup/data`date +%F-%H-%M-%S`;mkdir -p $dir;mv -t $dir'
```
>永久保存方法：
>对当前用户有效：写入 `~/.bashrc`
>对所哟用户有效：写入 `etc/.bashrc`
>启用配置文件：`source .bashrc`或`. .bashrc`
## ls
```shell
语法格式：ls [OPTION]... [FILE].

-a  显示所有隐藏文件
-i  显示文件索引节点（inode）
-l  以长格式显示目录下内容列表
    长格式输出信息：文件名、文件类型、权限、硬链接数、所有者、组、文件大小、修改时间
    ls -l              #默认显示文件的mtime--最后一次文件数据部分的修改时间
	ls -l --time=ctime #显示文件的ctime--最后一次元数据的修改时间
	ls -l --time=atime #显示文件的atime--最后一次访问时间
-t  用文件目录的更改时间排序
-S  按文件大小，从大到小排序
-d  可查询目录信息

#ls后面支持通配符过滤，不加单引号
ls -l *.txt

#关于文件的时间属性详解
atime: 记录最后一次的访问时间
mtime: 记录最后一次文件数据部分的修改时间
ctime: 记录最后一次文件元数据的修改时间
```
## history
![[assets/Pasted image 20251016164317.png]]
```shell
# 查看历史命令
history
# 清空历史命令，仅清空命令缓存区的命令，不影响.bash_history
history -c

ctrl+r  # 搜索模式
```
##  touch
```bash
如果文件存在则刷新时间，如果不存在则创建空文件

touch -a #改变atime, ctime
touch -m #改变mtime, ctime
touch -h #刷新链接文件本身，默认刷新目标文件
touch -c #只刷新已存在的文件，如果文件不存在，也不会创建文件
touch -r #使用某个文件的修改时间作为当前文件的修改时间

touch -t
# 修改atime,mtime到指定日期时间
# 比如01020304，指2024-01-02 03:04:00
# 比如0102030405， 指2001-02-03 04:05:00
```
## cp
```shell
**
 -b 覆盖已存在的目标前先对其做备份，后缀为~
 -S 指定备份文件的后缀名
 -i 覆盖前会先询问用户（推荐使用）
 -r 递归处理，将目录及其中的为文件一同复制
 -a 复制特殊文件，使用-a,例如：cp -a /dev/zero .
```
## mv
```shell
语法：mv 目标文件 目标路径

-t  反转目标文件与目标路径
-i  如果会覆盖文件则提示
-b  覆盖文件时会备份被覆盖的文件
```
## rm
```bash
-f 强制删除文件，即在删除文件时不提示确认，并自动忽略不存在的文件
-r 递归删除，目标是目录的话，整个目录文件全部删除
```
## pwd
```bash
pwd -P  # 输出真实物理路径
pwd -L  # 默认，输出链接路径
```
## basename
```shell
#只输出文件名

basename `which cat`
# 输出：cat
```
## dirname
```bash
# 只输出路径

dirname `which cat`
# 输出：/usr/bin
```
## tldr
>TLDR: Too Long；Didn’t Read(太长不看)，也可以叫作 “偷懒的人“
>https://github.com/tldr-pages/tldr
```shell
# 安装Node.js和npm
apt update
apt install nodejs npm
# 安装 tldr 命令行客户端
npm install -g tldr
# 安装完成后，验证tldr是否安装成功。在终端运行以下命令
tldr

# 使用示例
# 第一次会先下载数据，因此会比较慢
tldr ls

```
## which
```shell
# 查看外部命令存放路径
which man
/usr/bin/man  #结果
```
## whereis 
```shell
# 除了命令外，显示和命令相关的帮助文档等文件路径
whereis man                                                              
# 结果
man: /usr/bin/man /usr/local/man /usr/share/man /usr/share/man/man7/man.7.gz /usr/share/man/man1/man.1.gz

```
## hash
```shell
hash # 显示当前终端进程中的 hash 缓存
hash -r # 清空所有 hash

hash -l # 显示详细创建此条 hash 的命令，可作为输入使用
hash -p path name # 手动创建 hash
hash -t name # 输出路径
hash -d name # 删除指定 hash
```
## tr
用于转换字符、删除字符和压缩重复的字符，从标准输入读数据并将结果输出到标准输出
```shell
tr [OPTION]... SET1 [SET2]
#常用选项
-c|-C|--complement # 取字符集的补集
-d|--delete # 删除所有属于第一字符集的字符
-s|--squeeze-repeats # 把连续重复的字符以单独一个字符表示，即去重
-t|--truncate-set1 # 将第一个字符集对应字符转换为第二个字符集对应的字符，如果第一 个字符集的字符数量多于第二字符集 数量，超出部分忽略

# 文件重定向
# 替换大小写
[root@ubuntu2204 ~]#tr 'a-z' 'A-Z' < /etc/issue
UBUNTU 22.04.1 LTS \N \L
# 保留所需字符
[root@ubuntu2204 ~]#tr -dc 'a-z0-9A-Z' < /dev/random |head -c 10
72waODnf7x

#常用通配符
[:alnum:]：字母和数字
[:alpha:]：字母
[:digit:]：数字
[:lower:]：小写字母
[:upper:]：大写字母
[:space:]：空白字符
[:print:]：可打印字符
[:punct:]：标点符号
[:graph:]：图形字符
[:cntrl:]：控制(非打印)字符
[:xdigit:]：十六进制字符
```
## bc
任意精度计算器语言
```shell
# 例：不开启小数计算1/2   
 bc < <(echo "1/2")
 0    # 输出
 # 例：开启小数计算/2
 bc < <(echo "scale=4; 1 / 2")
 .5000  # 输出
```
## tee
既要有要，执行命令同时把内容打印到控制台
```shell
tee [OPTION]... [FILE]...
# 常用选项
-a|--append # 内容追加到给定的文件而非覆盖
-i|--ignore-interrupts # 忽略中断信号
-p # 对写入非管道的行为排查错误，其使用的是 warn-nopipe
--output-error[=模式] # #设置写入出错时的行为 (warn|warn-nopipe|exit|exit-nopipe)
cmd1 | tee [-a ] filename | cmd2

# 使用方式
echo "hello" | tee 1.txt
# tee.log 和终端输出都是大写
echo hello | tr 'a-z' 'A-Z' | tee tee.log
HELLO
```
##  useradd
```shell
useradd [options] LOGIN
useradd -D
useradd -D [options]
#常见选项
-u|--uid UID #指定UID
-g|--gid GID #指定用户组，-g groupname|--gid GID
-c|--comment COMMENT #新账户的 GECOS 字段
-d|--home-dir HOME_DIR #指定家目录，可以是不存在的，指定家目录，并不代表创建家目录
-s|--shell SHELL #指定 shell，可用shell在/etc/shells 中可以查看
-r|--system #创建系统用户,CentOS 6之前 ID<500，CentOS7 以后ID<1000，不会
创建登录用户相关信息
-m|--create-home #创建家目录，一般用于登录用户
-M|--no-create-home #不创建家目录，一般用于不用登录的用户
-p|--password PASSWORD #设置密码，这里的密码是以明文的形式存在于/etc/shadow 文件中
-G|--groups GROUP1[,GROUP2,...] #为用户指明附加组，组须事先存在
-D|--defaults #显示或更改默认的 useradd 配置，默认配置文件
是/etc/default/useradd
-e|--expiredate EXPIRE_DATE #指定账户的过期日期 YYYY-MM-DD 格式
-f|--inactive INACTIVE #密码过期之后，账户被彻底禁用之前的天数，0 表示密码过期立即禁
用，-1表示不使用此功能
-k|--skel SKEL_DIR #指定家目录模板，创建家目录，会生成一些默认文件，如果指定，就从该目录复制文件，默认/etc/skel/，要配合-m
```
## usermod
```shell
usermod [options] LOGIN
#常见选项
-c|--comment COMMENT #修改注释
-d|--home HOME_DIR #修改家目录
-e|--expiredate EXPIRE_DATE #修改过期的日期，YYYY-MM-DD 格式
-f|--inactive INACTIVE #密码过期之后，账户被彻底禁用之前的天数，0 表示密码过期立即禁用，-1表示不
使用此功能
-g|--gid GROUP #修改组
-G|--groups GROUPS #groupName|GID... 新附加组，原来的附加组将会被覆盖；若保留原有，则要同时
使用-a选项
-a|--append GROUP #将用户追加至上边 -G 中提到的附加组中，并不从其它组中删除此用户
-l|--login LOGIN #新的登录名称
-L|--lock #锁定用户帐号，在/etc/shadow 密码栏的增加 !
-m|--move-home #将家目录内容移至新位置，和 -d 一起使用
-s|--shell SHELL #修改 shell
-u|--uid UID #修改 UID
-U|--unlock #解锁用户帐号，将 /etc/shadow 密码栏的!拿掉
```
## userdel
```shell
userdel [options] LOGIN
#常见选项
-f|--force #强制删除，哪怕用户正在登录状态
-r|--remove #删除家目录和邮件目录
```
## groupadd
```shell
格式：groupadd [OPTION]... group_name
# 常见选项：
-g GID 指明GID号; [GID_MIN,GIDMAX]
-r 创建系统组，CentOS6之前：ID<500, CentOS 7以后：ID<1000
#注意：
#如果你知道你要创建的是一个系统组，并且你想确保它在系统组的 GID 范围内，那么使用 -r 选项是一个好的实践。如果你
#只是想创建一个具有特定 GID 的组，不管它是否是系统组，那么只使用 -g 选项就足够了。
#添加 -r 选项是为了明确表达你的意图，并确保组被正确地分类为系统组。不过，如果你手动指定了一个在系统组 GID 范围
#内的 GID，即使没有使用 -r 选项，该组在某种程度上也被视为系统组。

#范例：
groupadd -g 48 -r apache
```
## groupmod
```shell
格式：groupmod [OPTION]... group
#常见选项：
-n <新组名> <原组名>: 新名字
-g GID : 新的GID
#示例：
groupmod -n www apache
```
## groupdel
```
groupdel group_name 删除用户组
```
## chmod
## chown
```shell
# 将file文件的用户权限改为user_name
chown user_name file_name

#将该文件所属的用户名，组名一起变更。
chown user_name.group_name file_name
chown user_name:group_name file_name

#将文件夹下，所有文件的所属账号和组都一起变更，危险命
chown -R user_name.group_name dir
```
## chgrp 
仅更改文件所属组权限
```shell
chgrp group_name file
```
## umask
```shell
修改新建文件/文件夹的权限
# 查看当前umask的值
umask
-- root权限的默认umask值022
-- 普通用户的默认umask值002
-----------------------------------------------
# 修改默认权限的实现方式
# 指定新建文件的默认权限
# 666-umask，如果所得结果某位存在执行（奇数）权限，则将其权限+1，偶数不变将权限+1的原因：
# 文件的执行时危险的！！！，如果没有执行权限，root也无法直接执行，但是没有读写权限，root依然能够进行读写
# 基于安全考虑，默认新建的文件不允许有执行权限！！
umask 的内在机制
666
123 -- umask值
文件权限为：644
------------------------------------------------
指定新建目录的默认权限
777-umask
------------------------------------------------
# 修改默认权限 -- 临时修改
umask <更改后的数字> 

永久修改：
root目录下，.bashrc文件内修改，添加umask <数值>，保存退出后，. .bashrc或者重启
-- 全局设置：/etc/bashrc 不建议，这里修改会影响全局所有用户
-- 用户设置：~/.bashrc 只影响当前用户
```
