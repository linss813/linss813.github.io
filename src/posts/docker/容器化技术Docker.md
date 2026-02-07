---
title: 容器化技术Docker
tags:
  - Linux
  - 运维
  - docker
date: 2026-01-21
---

# 容器化技术Docker

- Docker 官网: http://www.docker.com
- 帮助文档链接: https://docs.docker.com/
- Docker 镜像: https://hub.docker.com/
- Docker 中文网站: http://www.docker.org.cn/
- 镜像加速网站：
	- https://dockerproxy.net/
## 容器核心技术
### Namespace（命名空间）：资源的隔离
让容器进程认为自己拥有一个独立的操作系统环境。

| **命名空间类型** | **隔离内容** | **作用**                            |
| ---------- | -------- | --------------------------------- |
| **PID**    | 进程 ID    | 容器内的进程拥有自己的 PID 体系，容器内看到的是 PID 1。 |
| **NET**    | 网络设备     | 每个容器有独立的虚拟网卡、IP 地址、路由表和防火墙规则。     |
| **MNT**    | 挂载点      | 容器只能看到并操作自己文件系统内的挂载点。             |
| **UTS**    | 主机名/域名   | 允许每个容器拥有独立的主机名（Hostname）。         |
| **IPC**    | 进程间通信    | 确保容器间的信号量、消息队列等通信手段互不干扰。          |
| **USER**   | 用户和组     | 容器内部的 root 用户在宿主机上可能只是一个普通用户。     |
### Cgroup（控制组）：资源的限制
- Cgroup 主要通过以下“子系统”来实现控制：
	- **CPU 限制**：限制容器使用的 CPU 核数或分配的时间片权重。
	- **Memory 限制**：设定容器可用的最大内存（RAM）和交换分区（Swap）。
	- **Block I/O**：限制磁盘读写速度（吞吐量和 IOPS）。
	- **Devices**：限制容器可以访问哪些硬件设备（如 GPU）。
## 安装
ubuntu2404环境
### 包安装
使用阿里云镜像提供的方法和镜像源
https://developer.aliyun.com/mirror/docker-ce
```shell
# ubuntu
# step 1: 安装必要的一些系统工具
sudo apt-get update
sudo apt-get install ca-certificates curl gnupg

# step 2: 信任 Docker 的 GPG 公钥
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Step 3: 写入软件源信息
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://mirrors.aliyun.com/docker-ce/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
 
# Step 4: 安装Docker
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 安装指定版本的Docker-CE:
# Step 1: 查找Docker-CE的版本:
# apt-cache madison docker-ce
#   docker-ce | 17.03.1~ce-0~ubuntu-xenial | https://mirrors.aliyun.com/docker-ce/linux/ubuntu xenial/stable amd64 Packages
#   docker-ce | 17.03.0~ce-0~ubuntu-xenial | https://mirrors.aliyun.com/docker-ce/linux/ubuntu xenial/stable amd64 Packages
# Step 2: 安装指定版本的Docker-CE: (VERSION例如上面的17.03.1~ce-0~ubuntu-xenial)
# sudo apt-get -y install docker-ce=[VERSION] docker-ce-cli=[VERSION]

apt install docker-ce=5:29.1.4-1~ubuntu.24.04~noble docker-ce-cli=5:29.1.4-1~ubuntu.24.04~noble
```
### 离线二进制安装
```shell
# 官方下载
wget https://download.docker.com/linux/static/stable/x86_64/docker-29.1.5.tgz

tar xf docker-29.1.5.tgz
cp docker/* /usr/local/bin/
```
#### 定制服务文件
```shell
cat > /lib/systemd/system/docker.service <<-EOF
[Unit]
Description=Docker Application Container Engine
Documentation=https://docs.docker.com
After=network-online.target firewalld.service
Wants=network-online.target

[Service]
Type=notify
# the default is not to use systemd for cgroups because the delegate issues still
# exists and systemd currently does not support the cgroup feature set required
# for containers run by docker
ExecStart=/usr/local/bin/dockerd -H unix:///var/run/docker.sock
ExecReload=/bin/kill -s HUP $MAINPID
# Having non-zero Limit*s causes performance problems due to accounting overhead
# in the kernel. We recommend using cgroups to do container-local accounting.
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
# Uncomment TasksMax if your systemd version supports it.
# Only systemd 226 and above support this version.
#TasksMax=infinity
TimeoutStartSec=0
# set delegate yes so that systemd does not reset the cgroups of docker containers
Delegate=yes
# kill only the docker process, not all processes in the cgroup
KillMode=process
# restart the docker process if it exits prematurely
Restart=on-failure
StartLimitBurst=3
StartLimitInterval=60s

[Install]
WantedBy=multi-user.target
EOF
```
#### 启动docker
```shell
systemctl daemon-reload
systemctl enable --now docker
systemctl status docker

docker version
```
#### 命令自动补全
```shell
curl -L \
https://raw.githubusercontent.com/docker/cli/master/contrib/completion/bash/docker \
-o /etc/bash_completion.d/docker.sh

exit  # 使其生效

docker version  # 检查
#  docker-init:
#   Version:          0.19.0
#   GitCommit:        de40ad0
```
#### 为docker配置代理文件
`/etc/docker/daemon.json`
添加json文件后重启docker服务
```json
mkdir -pv /etc/docker
cat > /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://docker.1panel.live",
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me"
  ],
  "insecure-registries": ["harbor.wang.org"]
}
EOF
```
## 常用命令
### 镜像管理 (Images)
镜像相当于一个“只读模板”。
```shell
docker pull          # 从远程仓库下载镜像
docker images        # 列出本地主机上所有的镜像
docker rmi           # 删除本地一个或多个镜像
docker save          # 将镜像保存为 tar 归档文件（备份）
docker load          # 从 tar 归档文件加载镜像
docker inspect       # 查看镜像的元数据和详细配置
docker image prune   # 删除所有未被使用的镜像
docker tag           # 为镜像创建一个新的标签（别名/版本）
```
### 容器管理 (Containers)
核心启动命令：`docker run`
```shell
# 示例：启动一个后台自动重启的 
Nginx docker run -d --name my-web -p 80:80 --restart always nginx
```
- **`-d`**：后台运行。
- **`--name`**：指定容器名称。
- **`-p`**：宿主机端口:容器端口映射。
- **`--restart always`**：容器崩溃或 Docker 重启后自动拉起。
- **`-it`**：开启交互终端（常用与执行 bash）。
#### 运行与启动
```shell
docker run -d        # 后台运行容器
docker run --name    # 为容器指定自定义名称
docker run -p        # 设置宿主机与容器的端口映射
docker run --restart # 设置容器退出后的重启策略
docker run -e        # 设置容器内的环境变量
docker start/stop    # 启动或停止已存在的容器
docker kill          # 强制停止运行中的容器
```
#### 查看与维护
```shell
docker ps            # 列出正在运行的容器
docker inspect       # 查看容器的详细运行状态与配置
docker logs          # 查看容器的控制台输出日志
docker rm -f         # 强制删除正在运行的容器    
docker top           # 查看容器内运行的进程信息
docker stats         # 实时查看容器资源使用率（CPU/内存）
docker exec -it      # 进入正在运行的容器执行交互命令
```

## 简单部署wordpress
### 拉取镜像  docker pull
```shell
docker pull mysql:8.0.44
docker pull wordpress:php8.5-apache
```
### 启动  docker run
- 启动mysql
```shell
docker run -d \
--name mysql \
--restart always \
-e MYSQL_ROOT_PASSWORD=123456 \
-e MYSQL_DATABASE=wordpress \
-e MYSQL_USER=wordpress \
-e MYSQL_PASSWORD=654321 \
mysql:8.0.44
```
- 启动wordpress项目
```shell
docker run --name wordpress -P -d \
-e WORDPRESS_DB_HOST=172.17.0.2 \
-e WORDPRESS_DB_USER=wordpress \ 
-e WORDPRESS_DB_PASSWORD=654321 \
-e WORDPRESS_DB_NAME=wordpress \
wordpress:php8.5-apache
```
- 查看端口
	可通过一下命令查看、筛选
```shell
# mysql服务IP地址
docker inspect -f '{{.NetworkSettings.Networks.bridge.IPAddress}}' mysql

ss -tnlp

docker inspect wordpress | grep -E 'port|ip' -i
```

```shell
[root@ubuntu2404 ~]# docker inspect wordpress | grep -E 'port|ip' -i
            "PortBindings": {},
            "IpcMode": "private",
            "PublishAllPorts": true,
            "ExposedPorts": {
            "Ports": {
                        "HostIp": "0.0.0.0",
                        "HostPort": "32768"
                        "HostIp": "::",
                        "HostPort": "32768"
                    "IPAMConfig": null,
                    "IPAddress": "172.17.0.3",
                    "IPPrefixLen": 16,
                    "IPv6Gateway": "",
                    "GlobalIPv6Address": "",
                    "GlobalIPv6PrefixLen": 0,
        "ImageManifestDescriptor": {
```
浏览器访问`172.17.0.3:32768`即可
## 镜像位置迁移
### 创建逻辑卷并挂载到 `/data`
通过lvs创建新的逻辑卷并挂载到`/data`路径下
```shell
lvdisplay # 查看卷名
[root@ubuntu2404 ~]# lvdisplay
  --- Logical volume ---
  LV Path                /dev/ubuntu-vg/ubuntu-lv
  LV Name                ubuntu-lv
  VG Name                ubuntu-vg

# 创建逻辑卷
lvcreate -L 25G -n lv_data ubuntu-vg

# 格式化
mkfs.ext4 /dev/ubuntu-vg/lv_data

# 创建路径并挂载
mkdir /data
mount /dev/ubuntu-vg/lv_data /data
echo "/dev/ubuntu-vg/lv_data /data ext4 defaults 0 0" >> /etc/fstab

```
### 迁移 Docker 镜像位置
停止 Docker 服务并迁移
```shell
systemctl stop docker
systemctl stop docker.socket

cp -rp /var/lib/docker /data/
```

 修改 Docker 配置文件
```shell
vim /etc/docker/daemon.json
```
```shell
{
  "data-root": "/data/docker"
}
```

加载配置并启动
```shell
systemctl daemon-reload
systemctl start docker
```
### 验证迁移结果
```shell
docker info | grep "Docker Root Dir"

[root@ubuntu2404 ~]# df -h /data
Filesystem                      Size  Used Avail Use% Mounted on
/dev/mapper/ubuntu--vg-lv_data   25G  3.7G   20G  16% /data
```
## 制作镜像

### 手动制作
```sh
docker commit [容器ID或名称] [新镜像名]:[标签]
```
#### 拉取镜像
```shell
docker pull alpine:3.20.0
```
#### 启动容器
```shell
docker run --name mynginx -it alpine:3.20.0 sh
```
##### 1.优化配置
```sh
# 容器内操作
sed -i 's@dl-cdn.alpinelinux.org@mirrors.tuna.tsinghua.edu.cn@'  /etc/apk/repositories
apk update 
apk --no-cache add tzdata gcc make curl zip unzip net-tools pstree wget libgcc libc-dev libcurl libc-utils pcre-dev zlib-dev libnfs pcre pcre2 libevent libevent-dev iproute2
ln -s /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
echo "Asia/Shanghai" > /etc/timezone
```
##### 2.下载源码并编译
```shell
# 容器内操作
wget https://nginx.org/download/nginx-1.28.0.tar.gz 
mkdir /usr/local/src 
tar xf nginx-1.28.0.tar.gz -C /usr/local/src 
cd /usr/local/src/nginx-1.28.0/ 
./configure --prefix=/apps/nginx 
make && make install
```
#### 将定制的容器制作为新镜像
```shell
docker commit mynginx nginx:v1.28
```

### dockerfile
https://docs.docker.com/reference/dockerfile
创建相关目录
```shell
mkdir /data/dockerfile/{web/{nginx,apache,tomcat,jdk},system/{centos,ubuntu,alpine,debian}} -p
```
#### Dockerfile相关命令
##### FROM
- **作用**：指定基础镜像，是 Dockerfile 的第一条指令。
- **示例**：
```Dockerfile
FROM alpine:3.20.0
```
##### LABEL
- **作用**：为镜像添加元数据（作者、描述、版本等）。
- **示例**：
```Dockerfile
LABEL version="1.0" description="Nginx 编译镜像"
```
##### COPY
- **功能**：单纯地将宿主机的文件或目录复制到镜像内。
- **特点**：语义清晰，不支持 URL 或自动解压。
```Dockerfile
COPY nginx.conf /etc/nginx/nginx.conf
```
##### ADD
- - **功能**：高级复制指令。
    - **特有能力**：
        1. **自动解压**：如果源文件是本地的压缩包（tar, gzip, bzip2 等），它会自动解压到目标路径。
        2. **支持 URL**：可以从远程 URL 下载文件。
```dockerfile
# 假设宿主机当前目录有 nginx-1.28.0.tar.gz
# 它会自动解压成目录，而不需要手动运行 tar xf
ADD nginx-1.28.0.tar.gz /usr/local/src/

# 直接从官网下载并存入镜像（不推荐，建议用 RUN wget）
ADD https://nginx.org/download/nginx-1.28.0.tar.gz /tmp/
```
###### COPY vs. ADD
- 原则：首选 `COPY`。它更透明，不容易出错。
- 场景：只有当你需要“自动解压本地压缩包”到镜像内时，才使用 `ADD`。
- 注意：不建议用 `ADD` 从 URL 下载文件，因为这会产生无法清理的镜像层垃圾，建议改用 `RUN wget`。
##### ARG (Build Argument)
- 生命周期：仅在镜像构建阶段有效。
- 特点：构建完成后，变量消失。运行容器时无法访问这些变量。
- 示例：
```Dockerfile
# 定义 Nginx 版本，构建时可以通过 --build-arg NGINX_VER=1.26 覆盖
ARG NGINX_VER=1.28.0
RUN wget https://nginx.org/download/nginx-${NGINX_VER}.tar.gz
```
##### ENV (Environment Variable)
- 生命周期：在构建阶段和运行阶段均有效。
- 特点：变量会固化到镜像元数据中，程序运行时可以读取。
- 示例：
```Dockerfile
# 设置 Nginx 安装路径，容器启动后程序也能通过 $NGINX_PATH 找到它
ENV NGINX_PATH=/apps/nginx
ENV PATH="${NGINX_PATH}/sbin:${PATH}"
```
######  ARG vs. ENV
- 使用场景：ARG 用于“定义构建时的配置”（如指定版本号）；ENV 用于“定义系统运行环境”（如时区、路径）。
- 协作：你可以通过 `ARG` 接收外部传入的版本号，然后在内部通过 `ENV` 将其固化。
##### RUN
- 阶段：构建镜像时执行。
- 目的：安装包、编译代码、修改系统配置。每执行一次 `RUN` 都会产生一层新镜像。
- 技巧：使用 `&&` 合并命令以减少层数。
```Dockerfile
# 建议使用 && 合并命令，减少镜像层数
RUN apk update && \
    apk add --no-cache gcc make pcre-dev zlib-dev
```
##### WORKDIR
- 作用：设置后续指令（RUN, CMD, COPY 等）的工作目录。**相当于`mkdir && cd`**
- 优点：比 `RUN cd /path` 更好，它会自动创建不存在的目录，并在后续指令中持续生效。
```Dockerfile
# 如果目录不存在，Docker 会自动创建
WORKDIR /usr/local/src
# 此时下载的文件会直接出现在 /usr/local/src 下
RUN wget https://nginx.org/download/nginx-1.28.0.tar.gz
```
##### CMD
- 作用：为容器启动提供默认执行程序和参数。
- 特性：会被 `docker run <image> <command>` 命令行后的参数完全覆盖。
```Dockerfile
# 默认启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
```
##### ENTRYPOINT
- 作用：指定容器启动时的主程序。
- 特性：不可被覆盖（除非使用 `--entrypoint`）。命令行后的参数会被当做附加参数传给它。
```Dockerfile
# 强制启动 Nginx
ENTRYPOINT ["nginx"]
# 配合 CMD 提供默认参数
CMD ["-g", "daemon off;"]
```

###### CMD vs. ENTRYPOINT
- 协作模式（推荐）：使用 `ENTRYPOINT` 定义程序，`CMD` 定义默认参数。
```Dockerfile
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
```
- 效果：这样用户执行 `docker run my-nginx -s reload` 时，只会覆盖参数部分，程序依然是 nginx。
##### EXPOSE
- 作用：声明镜像内服务监听的端口。
- 提示：这只是文档性声明，真正的端口映射需在 `docker run -p` 中完成。
```shell
# 告诉使用者这个容器需要开启 80 和 443 端口
EXPOSE 80 443
```
##### VOLUME
- 作用：声明匿名数据卷。
- 目的：防止用户忘记挂载目录导致持久化数据随容器删除而丢失。
```shell
# 将 Nginx 的日志目录设为匿名卷
VOLUME ["/apps/nginx/logs"]
```

##### SHELL
- 作用：指定 `RUN`、`CMD` 和 `ENTRYPOINT` 指令所使用的默认 Shell。
- 案例：
```dockerfile
# 将默认的 ["/bin/sh", "-c"] 改为使用 powershell (常用于 Windows 镜像)
SHELL ["powershell", "-Command"]
```

##### USER
- **作用**：指定运行后续命令以及容器运行时的用户名或 UID。
- **案例**：
```dockerfile
# 创建非 root 用户并切换，提高安全性
RUN adduser -D myuser
USER myuser
```
##### ONBUILD
- 作用：当该镜像作为“父镜像”被其他 Dockerfile 继承（`FROM`）时，才会触发执行的指令。
- 案例：
```dockerfile
# 在基础镜像中定义，子镜像构建时会自动拷贝其源码目录
ONBUILD COPY . /app/src
ONBUILD RUN make /app/src
```
##### HEALTHCHECK
- 作用：配置容器的健康检查命令，告诉 Docker 如何判断容器服务是否正常。
- 案例：
```dockerfile
# 每 5 分钟检查一次 Nginx 是否能响应，超时 3 秒
HEALTHCHECK --interval=5m --timeout=3s \
  CMD curl -f http://localhost/ || exit 1
```
##### STOPSIGNAL
- 作用：设置容器退出时发送给进程的系统调用信号（默认是 `SIGTERM`）。
- 案例：
```dockerfile
# Nginx 建议使用 SIGQUIT 来实现优雅停止
STOPSIGNAL SIGQUIT
```
#### 构建nginx
创建存放路径以及文件
```shell
mkdir /data/dockerfile
vim /data/dockerfile/Dockerfile
```
```shell
# 1. 指定基础镜像：使用轻量级的 Alpine Linux，极大地减小镜像体积
FROM alpine:3.20.0

# 2. 定义构建参数 (ARG)：仅在镜像构建 (docker build) 阶段有效
# 构建时可通过 --build-arg NGINX_VERSION=xxx 灵活更换版本
ARG NGINX_VERSION=1.28.0

# 3. 定义环境变量 (ENV)：在构建阶段和容器运行阶段均有效
ENV NGINX_HOME=/apps/nginx
ENV PATH=$NGINX_HOME/sbin:$PATH

# 4. 设置工作目录 (WORKDIR)：相当于 cd 指令，后续的下载、编译均在此目录下进行
# 如果目录不存在，Docker 会自动创建
WORKDIR /usr/local/src

# 5. 执行构建命令 (RUN)：这是最核心的部分，通过 && 将多条命令合并为一层
RUN sed -i 's@dl-cdn.alpinelinux.org@mirrors.tuna.tsinghua.edu.cn@' \
    /etc/apk/repositories && \
    apk update && \
    # 安装 Nginx 编译所需的依赖包
    # --no-cache: 不缓存安装包索引，节省空间
    apk --no-cache add tzdata gcc make curl \
    zip unzip net-tools pstree wget libgcc \
    libc-dev libcurl libc-utils pcre-dev zlib-dev \
    libnfs pcre pcre2 libevent libevent-dev iproute2 && \
    # 设置时区为上海
    ln -s /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    # 下载源码、解压、编译并安装
    wget https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz && \
    tar xf nginx-${NGINX_VERSION}.tar.gz && \
    cd nginx-${NGINX_VERSION} && \
    ./configure --prefix=$NGINX_HOME && \
    make && make install && \
    # 清理安装过程中的源码包以减小体积
    rm -rf /usr/local/src/*

# 6. 声明端口 (EXPOSE)：告知用户该容器打算监听 8088 端口
# 注意：这只是文档声明，实际映射仍需在启动时用 -p 指定
EXPOSE 80

# 7. 设置停止信号 (STOPSIGNAL)：Nginx 建议使用 SIGQUIT 实现优雅停止
# 它会让 Nginx 处理完当前请求后再退出
STOPSIGNAL SIGQUIT

# 8. 启动参数 (CMD)：提供 ENTRYPOINT 的默认参数
# -g "daemon off;": 让 Nginx 在前台运行，这是 Docker 容器能持续运行的关键
CMD ["-g", "daemon off;"]

# 9. 启动程序 (ENTRYPOINT)：定义容器的主程序
# 它与 CMD 配合，实际执行命令为：nginx -g "daemon off;"
ENTRYPOINT ["nginx"]
```
构建镜像
```shell
cd /data/dockerfile

docker build -t my-nginx:v1.1 ./
```
启动测试
```shell
docker run -d --name my-web \
-p 8088:80 --restart always \
my-nginx:v1.1

curl -I 10.0.0.100:8088
# HTTP/1.1 200 OK
```
### 多阶段构建 
**自动多阶段构建基于Alpine基础镜像编译Nginx 自定义镜像**
```shell
cd /data/dockerfile/web/nginx

wget http://nginx.org/download/nginx-1.28.1.tar.gz
tar xf nginx-1.28.1.tar.gz
cp nginx-1.28.1/conf/nginx.conf ./  # 将配置复制到当前目录作为模板
rm -rf nginx-1.28.1               # 删除解压目录，保持环境整洁
```
- **修改 Nginx 配置文件 (`nginx.conf`)：**
    - 修改 `user nginx;`
    - 修改 `worker_processes auto;`
    - 在 `http` 块最后添加 `include "conf.d/*.conf";` 以支持动态站点配置。
```shell
[root@ubuntu2404 nginx]# cat nginx.conf
user nginx ;
worker_processes  auto;
events {
    worker_connections  10240;
}
http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;
    server {
        listen       80;
        server_name  localhost;
        location / {
            root   html;
            index  index.html index.htm;
        }
        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   html;
        }
    }
    include "conf.d/*.conf"; 
}
```
#### 编写dockerfile
**编写`dockerfile-multistage`文件**
```shell
ARG VERSION=3.22.2
# 第一阶段：编译
FROM alpine:$VERSION
LABEL maintainer="wangxiaochun <root@wangxiaochun.com>"

ENV NGINX_VERSION=1.28.1
ENV NGINX_DIR=/apps/nginx

ADD nginx-$NGINX_VERSION.tar.gz /usr/local/src

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/' /etc/apk/repositories && \
    apk update && apk --no-cache add gcc make libgcc libc-dev libcurl libc-utils \
    pcre-dev zlib-dev libnfs pcre pcre2 net-tools curl pstree wget libevent \
    libevent-dev iproute2 openssl-dev && \
    cd /usr/local/src/nginx-$NGINX_VERSION && \
    ./configure --prefix=${NGINX_DIR} --user=nginx --group=nginx \
    --with-http_ssl_module --with-http_v2_module --with-http_realip_module \
    --with-http_stub_status_module --with-http_gzip_static_module --with-pcre \
    --with-stream --with-stream_ssl_module --with-stream_realip_module && \
    make && make install

COPY nginx.conf ${NGINX_DIR}/conf/nginx.conf

# 第二阶段：运行环境
FROM alpine:$VERSION
ENV NGINX_DIR=/apps/nginx
COPY --from=0 ${NGINX_DIR}/ ${NGINX_DIR}/
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/' /etc/apk/repositories \
    && apk update && apk --no-cache add tzdata curl pcre pcre2 \
    && ln -s /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && ln -sf ${NGINX_DIR}/sbin/nginx /usr/sbin/nginx \
    && addgroup -g 888 -S nginx \
    && adduser -u 888 -D -S -s /sbin/nologin nginx \
    && chown -R nginx:nginx ${NGINX_DIR}/ \
    && ln -sf /dev/stdout ${NGINX_DIR}/logs/access.log \
    && ln -sf /dev/stderr ${NGINX_DIR}/logs/error.log \
    && chmod +x /docker-entrypoint.sh

WORKDIR ${NGINX_DIR}/
HEALTHCHECK --interval=5s --timeout=3s CMD curl -fs http://localhost/

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["/apps/nginx/sbin/nginx","-g","daemon off;"]
```
#### 启动脚本
**启动脚本内容 (`docker-entrypoint.sh`)**
```shell
#!/bin/sh
# 自动生成虚拟主机配置
mkdir -p /apps/nginx/conf/conf.d/
cat > /apps/nginx/conf/conf.d/site.conf <<EOF
server {
    listen 80;
    server_name ${HOST:-www.wang.org};
    root /data/website;
}
EOF

# 创建网页目录并生成首页
mkdir -p /data/website/
echo ${HOST:-www.wang.org} > /data/website/index.html

# 执行 CMD 传入的命令
exec "$@"
```
#### 验证
**镜像构建与运行测试命令**
```shell
# 构建镜像
docker build -t nginx:v0.1 -f dockerfile-multistage .

# 查看生成的镜像
docker images

# 运行容器
docker run -d --name mynginx -p 80:80 nginx:v0.1

# 查看容器运行状态
docker ps

# 在容器内查看进程情况
docker exec mynginx ps aux

# 测试访问（宿主机执行）
curl 127.0.0.1 -I
curl -H"host: www.wang.org" 127.0.0.1
```
**多阶段构建优势**

| **维度**   | **传统构建 (单阶段)**                | **多阶段构建**       |
| -------- | ----------------------------- | --------------- |
| 镜像体积 | 臃肿，包含源码和编译器                   | 极小，仅包含运行环境和成品   |
| 安全性  | 风险高，镜像内含有编译工具，易被黑客利用          | 风险低，攻击面小        |
| 构建速度 | 重复构建时缓存利用率低                   | 每一阶段独立，缓存更高效    |
| 维护性  | 一个 Dockerfile 搞定所有，无需手动清理中间文件 | 逻辑清晰，符合“单一职责原则” |
## Docker数据管理
Docker镜像由多个只读层叠加而成，启动容器时，Docker会加载只读镜像层并在镜像栈顶部添加一个读写层。
Docker镜像是分层设计的，镜像层是只读的，通过镜像启动的容器添加了一层可读写的文件系统，用户写入的数据都保存在这一层中。
### 容器的分层
#### 联合文件系统 (UnionFS)
Docker 镜像并非一个单一的巨大文件，而是由多个独立的层（Layer）组成的。这背后依赖于 **UnionFS** 技术。
分层剖析（以多阶段 Nginx 为例）：
每一层都是不可变的
-  **基础镜像层** (Base Image)：Alpine Linux 核心，提供最小运行环境。
-  **依赖层**：通过 `apk add` 引入的 `pcre`、`openssl` 动态库。
-  **应用层**：从 Builder 阶段通过 `COPY` 搬运过来的二进制执行文件。
-  **配置层**：最后加入的 `nginx.conf` 和启动脚本。
#### 只读镜像层
- **不可变性**：一旦镜像构建完成，这些层就是只读的，永远不会改变。
- **共享性**：如果基于同一个 Nginx 镜像启动了 10 个容器，这 10 个容器会共享宿主机上同一份只读镜像数据，不会占用 10 倍空间。
#### 可写容器层
- **生命周期**：当容器启动时，Docker 会在镜像层最上方添加一个薄薄的“可写层”。
- **临时性**：所有在运行期间产生的修改（如你在 `docker-entrypoint.sh` 中创建的 `site.conf` 或生成的日志）都只存在于这一层。
- **销毁即消失**：如果你删除了容器，这一层的数据也会随之丢失。
#### 写时复制 (Copy-on-Write)
如果在容器内修改一个只读层的文件，Docker 会触发以下流程：
1. **向上查找**：从顶部开始向下寻找目标文件。
2. **执行拷贝**：找到文件后，将其复制到顶部的可写层。
3. **实时覆盖**：修改可写层中的副本。此时，容器内看到的版本是修改后的，下层的原件被“隐藏”。

> 性能贴士：大文件的写时复制会导致明显的延迟。因此，不建议在容器层进行大规模数据写入。

### 容器数据持久化
如果要将写入到容器的数据永久保存，则需要将容器中的数据保存到宿主机的指定目录
#### 绑定挂载（Bind Mount）
这种方式可以将指定的宿主机上的任意文件或目录挂载到容器内。与卷不同，绑定挂载依赖于宿主
机的文件系统结构
- **特点：** 性能极高，不经过 Docker 存储驱动（如 Overlay2）的写时复制（CoW）层，直接读写宿主机物理硬盘。
- **应用场景：** 源代码热同步、日志持久化、配置文件共享。
```shell
# -v 宿主机绝对路径:容器内绝对路径
docker run -d --name mynginx-web \
  -v /data/html:/data/website \
  nginx-pro:v1.0
```
####  卷（Volume）
这是 Docker 推荐的挂载方式。卷是完全由 Docker 管理的文件目录，可以在容器之间共享和重
用。在创建卷时，Docker 创建了一个目录在宿主机上，然后将这个目录挂载到容器内。卷的主要
优点是你可以使用 Docker CLI 或 Docker API 来备份、迁移或者恢复卷，而无需关心卷在宿主机上
的具体位置。
卷分为匿名卷和命名卷
##### 命名卷
```shell
# 1. 创建卷
docker volume create nginx-log

# 2. 挂载卷
docker run -d \
  --name web-server \
  -v nginx-log:/apps/nginx/logs \
  nginx:v0.1
```

### wordpress持久化
```shell
# 部署 MySQL 数据库容器
docker run -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=123456 \
  -e MYSQL_DATABASE=wordpress \
  -e MYSQL_USER=wordpress \
  -e MYSQL_PASSWORD=654321 \
  --name mysql -d \
  -v /data/mysql:/var/lib/mysql \      # 持久化
  --restart=always \
  registry.cn-beijing.aliyuncs.com/wangxiaochun/mysql:8.0.29-oracle
  
# 部署 WordPress 容器
docker run -d -p 80:80 \
  --name wordpress \
  -v /data/wordpress:/var/www/html \    # 持久化
  --restart=always \ 
  registry.cn-beijing.aliyuncs.com/wangxiaochun/wordpress:6.9.0-php8.5-apache
  
```

## Docker网络管理
###  Docker安装后默认的网络设置
Docker服务安装完成之后，默认在每个宿主机会生成一个名称为docker0的网卡其IP地址都是172.17.0.1/16
```shell
[root@ubuntu2404 nginx]#ip a show docker0
3: docker0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default 
    link/ether 1a:3a:59:26:8c:98 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever
    inet6 fe80::183a:59ff:fe26:8c98/64 scope link 
       valid_lft forever preferred_lft forever
```
### 创建容器后的网络配置
veth（Virtual Ethernet）是Linux内核中的一种虚拟网络设备，通常用于连接两个网络命名空间。veth设备总是成对出现
容器内网卡  `eth0@if6` 数字6对应宿主机网卡第6个，宿主机网卡`vethf8813a1@if2`的数字2对应容器内的第2个。
```shell
# 容器内网卡   eth0@if6
[root@ubuntu2404 nginx]#docker exec -it 18f631b0aff2 ip a
2: eth0@if6: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1500 qdisc noqueue state UP 
    link/ether ea:29:4c:15:a9:ea brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.2/16 brd 172.17.255.255 scope global eth0
       valid_lft forever preferred_lft forever
# 宿主机网卡   vethf8813a1@if2
[root@ubuntu2404 nginx]#ip a
6: vethf8813a1@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master docker0 state UP group default 
    link/ether 7a:b5:19:68:36:c8 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet6 fe80::78b5:19ff:fe68:36c8/64 scope link 
       valid_lft forever preferred_lft forever
```
### linux网桥 
Linux 网桥（Bridge）在软件层面模拟了物理交换机的功能。
- **功能**：它可以在不同的网络接口之间转发数据包。
- **Docker 中的应用**：当你运行 Docker 时，默认会创建一个名为 `docker0` 的虚拟网桥。所有容器默认都会连接到这个网桥上，通过它进行容器间通信或访问外网。
#### brctl
`bridge-utils` 是一个经典的工具集，用于配置和管理 Linux 内核虚拟网桥
```shell
apt -y install bridge-utils 
brctl show
```
```shell
[root@ubuntu2404 nginx]# brctl show
bridge name     bridge id               STP enabled     interfaces
docker0         8000.1a3a59268c98       no              vethb60f28c
                                                        vethf8813a1
```
常用命令
```shell
# 查看所有网桥信息
brctl show

# 创建/删除网桥
brctl addbr mybridge    # 创建名为 mybridge 的网桥
brctl delbr mybridge    # 删除网桥

# 接口管理（将接口加入网桥）
brctl addif mybridge eth1  # 添加接口
brctl delif mybridge eth1  

# MAC 地址表管理
brctl showmacs mybridge   # 查看 MAC 地址表
```
现代替代方案
```shell
ip link show type bridge
# 创建网桥
ip link add name br0 type bridge
# 添加接口
ip link set eth0 master br0
```

###  Docker 网络连接模式(重点)
Docker 的网络支持 5 种网络模式: 
- none
- host
- bridge
- container
- network-name
















## 面试
##### 对于已经启动的容器，怎么查看他的启动命令及参数
docker run -rm -v /var/run/docker.sock assafiavie/runlike 容器名或ID
- 通过第三方项目runlike








---
