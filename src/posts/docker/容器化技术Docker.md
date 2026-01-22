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
{  
    "registry-mirrors": [  
        "https://docker.m.daocloud.io",  
        "https://docker.1panel.live",  
        "https://docker.1ms.run",  
        "https://docker.xuanyuan.me"  
    ],  
    "insecure-registries": ["harbor.wang.org"]  
}
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

