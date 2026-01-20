---
title: Redis
date: 2026-01-16
category:
  - 运维
tags:
  - Linux
  - redis
  - 运维
---
# Redis

## NoSQL 概述

**NoSQL（Not Only SQL）** 是一类非关系型数据库，主要用于解决传统关系型数据库在高并发、海量数据和低延迟场景下的瓶颈问题。

典型特点：

- 高性能读写
    
- 易于水平扩展
    
- 弱化复杂事务
    

常见类型：

- **Key-Value**：Redis
    
- **文档型**：MongoDB
    
- **列存储**：HBase
    

---

## CAP 理论

分布式系统中以下三点不可同时满足：

- **一致性（C）**：所有节点数据一致
    
- **可用性（A）**：请求总能得到响应
    
- **分区容忍性（P）**：容忍网络分区
    

Redis：

- 单机：偏 **CA**
    
- Cluster：偏 **AP**
    

---

## Redis 核心特性

- 内存存储，性能极高
    
- 单线程模型（IO 多路复用）
    
- 支持持久化
    
- 丰富的数据结构
    
- 原生集群支持
    

---
## Redis 源码编译安装
环境说明
- 系统：Ubuntu 24.04
    
- Redis 版本：8.4.0
    
- 安装方式：源码编译
    
- 安装路径：`/apps/redis`

### 安装依赖
```shell
apt update && apt install -y --no-install-recommends \
gcc g++ make cmake git wget \
libc6-dev libssl-dev \
python3 python3-pip python3-venv python3-dev \
automake autoconf libtool pkg-config \
libsystemd-dev rsync unzip ca-certificates
```
### 下载解压
```shell
cd /usr/local/src
wget https://download.redis.io/releases/redis-8.4.0.tar.gz
tar xf redis-8.4.0.tar.gz
cd redis-8.4.0
```
### 编译参数设置
```shell
export BUILD_TLS=no
export BUILD_WITH_MODULES=no
export INSTALL_RUST_TOOLCHAIN=no
export DISABLE_WERRORS=yes
```
说明：
- 关闭 TLS、模块、Rust，减少依赖
- 关闭 WERROR，避免因警告导致编译失败
### 编译并安装到指定目录
```shell
make -j $(nproc) USE_SYSTEMD=yes PREFIX=/apps/redis install
```
### 创建用户和工作目录
```shell
useradd -r -s /sbin/nologin redis
mkdir -p /apps/redis/{etc,data,log,run}
chown -R redis:redis /apps/redis
```
### 准备并修改配置文件
```shell
cp redis-8.4.0/redis.conf /apps/redis/etc/redis.conf
```

 关键配置项：
```shell
bind 0.0.0.0 
dir /apps/redis/data 
logfile "/apps/redis/log/redis.log" 
pidfile "/apps/redis/run/redis_6379.pid" 
```
### 配置 systemd 服务
```shell
cd /usr/local/src/redis-8.4.0
cp utils/systemd-redis_server.service /lib/systemd/system/redis.service
```

修改核心内容：
```shell
ExecStart=/apps/redis/bin/redis-server /apps/redis/etc/redis.conf 
User=redis 
Group=redis 
LimitNOFILE=1000000
```
### 启动 Redis 并设置开机自启
```shell
systemctl daemon-reload 
systemctl enable redis 
systemctl start redis
```

--- 
## Redis关键配置
```shell
##################################
# Redis 基础配置
# 位置：
# /apps/redis/etc/redis.conf
##################################

# ---------- 网络与安全 ----------
bind 0.0.0.0                  # 允许远程/集群访问
protected-mode yes            # 开启基础安全保护
requirepass 123456            # Redis 访问密码（集群内必须一致）

# ---------- 运行方式 ----------
daemonize no                  # systemd 管理时必须为 no
supervised systemd            # 启用 systemd 监管
pidfile /apps/redis/run/redis_6379.pid

# ---------- 目录与日志 ----------
dir /apps/redis/data          # 数据目录（RDB/AOF）
logfile /apps/redis/log/redis.log

# ---------- RDB 持久化 ----------
save 3600 1                   # 1小时内 ≥1 次写入生成快照
save 300 100                  # 5分钟内 ≥100 次写入生成快照
save 60 10000                 # 1分钟内 ≥10000 次写入生成快照

# ---------- AOF 持久化（生产推荐） ----------
appendonly yes
appendfsync everysec          # 最多丢失1秒数据

# ---------- 主从复制 ----------
replicaof 10.0.0.108 6379     # 主节点地址
masterauth 123456             # 连接主节点的认证密码

# ---------- Cluster 集群 ----------
cluster-enabled yes                   # 开启cluster模式
cluster-config-file nodes-6379.conf   # 集群状态文件（自动维护）
cluster-require-full-coverage no      # 提高可用性

```

---

## Redis 数据类型

### String（字符串）
-  使用场景：缓存、计数器、Session
```bash
# 设置键值
SET key value

# 获取值
GET key

# 设置并指定过期时间（秒）
SETEX key 60 value

# 原子自增 / 自减
INCR counter
DECR counter

# 批量操作
MSET k1 v1 k2 v2
MGET k1 k2
```
### List（列表）
- 使用场景：消息队列、任务列表
```shell
# 从左/右插入元素
LPUSH list a b c
RPUSH list d e

# 从左/右弹出元素
LPOP list
RPOP list

# 获取指定范围元素
LRANGE list 0 -1

# 阻塞式弹出（常用于队列）
BLPOP list 0
BRPOP list 0

```
### Set（集合）
- 使用场景：去重、关系计算
```shell
# 添加元素
SADD set a b c

# 查看所有元素
SMEMBERS set

# 判断元素是否存在
SISMEMBER set a

# 删除元素
SREM set a

# 集合运算
SINTER set1 set2   # 交集
SUNION set1 set2   # 并集
SDIFF set1 set2    # 差集

```
### ZSet（有序集合）
- 使用场景：排行榜、延迟队列
 
```shell
# 添加元素（score member）
ZADD zset 100 user1
ZADD zset 90 user2

# 按 score 升序获取
ZRANGE zset 0 -1 WITHSCORES

# 按 score 降序获取
ZREVRANGE zset 0 -1 WITHSCORES

# 获取指定 score 范围
ZRANGEBYSCORE zset 80 100

# 增加 score
ZINCRBY zset 10 user1

```
### **Hash**：对象存储
- 使用场景：对象存储
 
```shell
# 设置字段
HSET user:1 name tom age 18

# 获取字段
HGET user:1 name

# 获取所有字段和值
HGETALL user:1

# 判断字段是否存在
HEXISTS user:1 age

# 删除字段
HDEL user:1 age

```

---

## Redis 持久化机制

### RDB

- 内存快照（dump.rdb）
    
- `bgsave` 后台生成（推荐）
    
- 恢复速度快
    

### AOF

- 记录写命令
    
- 刷盘策略：`everysec`（推荐）
    
- 数据安全性更高
    

**恢复顺序：**

> 启动时优先使用 AOF，其次 RDB

---

## Redis Cluster（集群）

Redis Cluster 是官方分布式方案，用于解决：

- 单机内存限制
    
- 单点故障
    
- 横向扩展
    

核心能力：

- 去中心化
    
- 自动分片
    
- 自动故障转移
    

---

### Hash Slot 机制

- 共 **16384 个 slot**
    
- `CRC16(key) % 16384`
    
- slot 只属于 master
    
- slave 仅用于复制
    

---

## Redis Cluster 实操

### 集群部署（6 节点，3 主 3 从）
```shell
redis-cli --cluster create 10.0.0.101:6379 10.0.0.102:6379 10.0.0.103:6379 10.0.0.104:6379 10.0.0.105:6379 10.0.0.106:6379 --cluster-replicas 1
```


---

### 集群状态查看

```shell
CLUSTER INFO  
CLUSTER NODES  
CLUSTER SLOTS
```


---

### 扩容实操

#### 添加新 Master
```shell
redis-cli --cluster add-node 10.0.0.100:6379 10.0.0.101:6379
```

#### 重新分配 slot
```shell
redis-cli --cluster reshard 10.0.0.101:6379
```

关键交互：

- slots：需要迁移的数量
    
- receiving：新 master
    
- source：原 master（或 all）
    

---

### 缩容实操

#### 迁移 slot（必须先做）
```shell
redis-cli --cluster reshard 10.0.0.101:6379

示例：

How many slots? 1365  
Receiving node: <保留的 master>  
Source node: <待删除的 master>
```
#### 删除节点

```shell
redis-cli --cluster del-node 10.0.0.101:6379 <node-id>
```
---

## 缓存典型问题（压缩版）

- **穿透**：布隆过滤器 / 缓存空值
    
- **击穿**：互斥锁 / 热点永不过期
    
- **雪崩**：过期时间随机化 / 集群
    

---

## Redis 运维优化

- 设置内存策略：
    

sysctl vm.overcommit_memory=1

- 合理配置 maxmemory
    
- 禁用危险命令
    
- 生产环境开启 AOF
    

---

## 总结

- Redis 是高性能内存数据库
    
- Cluster 提供高可用与扩展能力
    
- 扩缩容本质是 **slot 迁移**
    
- 合理持久化与缓存设计是关键