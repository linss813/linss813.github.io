---
title: Redis详细配置使用与面试题
date: 2026-01-16
category:
  - 运维
tags:
  - Linux
  - redis
  - 运维
---
# Redis详细配置使用与面试题

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
## Redis配置文件
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
Redis 本身是一种内存数据库，为了保证数据在重启或故障时不丢失，它提供了两种主要的持久化方式：
- **RDB（快照持久化）**：周期性生成内存快照
		- `SAVE` —— **同步阻塞式**
		- `BGSAVE` —— **异步后台式**
- **AOF（追加文件持久化）**：记录每条写命令日志
Redis 启动时默认优先使用 AOF 恢复；如果没有 AOF，则使用 RDB。

### RDB
RDB 是 Redis 将当前内存状态在某个时间点“拍快照”，生成二进制文件 `dump.rdb`。  
优点是恢复快、结构紧凑；缺点是有可能丢失最后一次快照之后的数据。
- 内存快照（dump.rdb）
- `bgsave` 后台生成（推荐）
- 恢复速度快
#### RDB 的配置与启用
```shell
# RDB 持久化规则
save 3600 1      # 1 次写入触发快照
save 300 100     # 100 次写入触发快照
save 60 10000    # 10000 次写入触发快照

# 保存 RDB 文件的目录（必须存在）
dir /apps/redis/data
```
#### 手动触发 RDB
```shell
redis-cli -a 123456 BGSAVE
```
### AOF
AOF（Append Only File）会将每条写命令以纯文本形式追加到文件末尾。Redis 重启时会按序回放这些命令重建数据。
- 记录写命令
- 刷盘策略：`everysec`（推荐）
- 数据安全性更高
启用 AOF
```SHELL
appendonly yes
appendfilename "appendonly.aof"

# 每秒刷盘一次
appendfsync everysec
```
**恢复顺序：**

> 启动时优先使用 AOF，其次 RDB

---
## Redis Cluster 与 Sentinel 对比
|对比项|Sentinel|Cluster|
|---|---|---|
|自动分片|❌|✅|
|高可用|✅|✅|
|客户端感知|否|是|
|使用 Sentinel|必须|不需要|

---
## 主从复制与哨兵模式（sentinel）
### 实验环境
| 角色       | IP              | 端口    |
| -------- | --------------- | ----- |
| Master   | 10.0.0.101      | 6379  |
| Slave    | 10.0.0.102      | 6379  |
| Slave    | 10.0.0.103      | 6379  |
| Sentinel | 101 / 102 / 103 | 26379 |
### 编辑配置文件
#### Master 10.0.0.101
关键配置
```shell
# vim /apps/redis/etc/redis.conf

bind 0.0.0.0
port 6379
protected-mode yes
requirepass 123456

daemonize no
supervised systemd

dir /apps/redis/data
logfile /apps/redis/log/redis.log
pidfile /apps/redis/run/redis_6379.pid
```
重新启动redis
```shell
systemctl restart redis
```
#### Slave（10.0.0.102、10.0.0.103）
两台从节点配置相同，仅需增加 **replicaof**
```shell
bind 0.0.0.0
port 6379
protected-mode yes
requirepass 123456

replicaof 10.0.0.101 6379
masterauth 123456

replica-read-only yes

daemonize no
supervised systemd

dir /apps/redis/data
logfile /apps/redis/log/redis.log
pidfile /apps/redis/run/redis_6379.pid
```
重新启动redis
```shell
systemctl restart redis
```
#### 验证主从
```shell
redis-cli -a 123456 INFO replication
```

### Sentinel（哨兵）配置

#### 配置文件
/apps/redis/etc/sentinel.conf
```shell
# cp /usr/local/src/redis-8.4.0/sentinel.conf /apps/redis/etc/sentinel.conf

bind 0.0.0.0
port 26379
protected-mode yes

daemonize no
supervised systemd
pidfile /apps/redis/run/redis-sentinel.pid
logfile /apps/redis/log/sentinel-26379.log
dir /apps/redis/data

sentinel monitor mymaster 10.0.0.101 6379 2
sentinel auth-pass mymaster 123456

sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
```

说明：
- `mymaster`：逻辑名称
- `quorum=2`：至少 2 个 Sentinel 同意才判定故障
#### Sentinel systemd 服务
```shell
vim /lib/systemd/system/redis-sentinel.service
```

```shell
[Unit]
Description=Redis Sentinel
After=network.target

[Service]
ExecStart=/apps/redis/bin/redis-sentinel /apps/redis/etc/sentinel.conf
User=redis
Group=redis
Restart=always

[Install]
WantedBy=multi-user.target
```
#### 启动 Sentinel（三台都执行）
```shell
systemctl daemon-reload
systemctl enable redis-sentinel
systemctl start redis-sentinel
```
#### 验证 Sentinel 状态
在任意节点执行：
```shell
redis-cli -p 26379 INFO sentinel
```
查看监控信息：
```shell
redis-cli -p 26379 SENTINEL masters 
redis-cli -p 26379 SENTINEL slaves mymaster 
redis-cli -p 26379 SENTINEL sentinels mymaster
```
#### 故障转移测试
##### 停止 Master（10.0.0.101）
```shell
systemctl stop redis
```
##### 观察 Sentinel 自动切换
```shell
redis-cli -p 26379 SENTINEL masters
```
注意到：
- 102 或 103 被提升为 **新 Master**
- 其余节点自动切换为 Slave
#####  恢复原 Master
```shell
systemctl start redis
```
原 101 会自动变成 **Slave**

---

## Redis Cluster（集群）

Redis Cluster 是 Redis 官方提供的分布式解决方案，主要解决：
- 单机内存容量限制
- 单点故障问题
- 横向扩展需求

**核心特点：**
- 去中心化架构
- 自动分片（Hash Slot）
- 内建主从复制
- 自动故障转移
- **不依赖 Sentinel**

**Hash Slot 机制**
- 共 **16384 个 slot**
- `CRC16(key) % 16384`
- slot 只属于 master
- slave 仅用于复制

### 实验环境
| 节点    | IP         | 端口   |
| ----- | ---------- | ---- |
| node1 | 10.0.0.101 | 6379 |
| node2 | 10.0.0.102 | 6379 |
| node3 | 10.0.0.103 | 6379 |
| node4 | 10.0.0.104 | 6379 |
| node5 | 10.0.0.105 | 6379 |
| node6 | 10.0.0.106 | 6379 |
> 需要关闭哨兵模式
### 集群节点配置文件
六台节点的 `redis.conf` 基本一致，关键配置如下：
```shell
bind 0.0.0.0
port 6379
protected-mode yes
requirepass 123456

daemonize no
supervised systemd

dir /apps/redis/data
logfile /apps/redis/log/redis.log
pidfile /apps/redis/run/redis_6379.pid

cluster-enabled yes
cluster-config-file nodes-6379.conf
cluster-require-full-coverage no
```
说明：
- `cluster-enabled yes`：开启集群模式
- `nodes-6379.conf`：集群状态文件，自动生成
- 所有节点密码必须一致
### 启动 Redis（六台都执行）

```shell
systemctl restart redis
redis-cli -a 123456 ping  
```

### 创建 Redis Cluster

在 **任意一台节点（如 10.0.0.101）** 执行：
```shell
redis-cli -a 123456 --cluster create \ 
10.0.0.101:6379 10.0.0.102:6379 10.0.0.103:6379 \ 
10.0.0.104:6379 10.0.0.105:6379 10.0.0.106:6379 \ 
--cluster-replicas 1
```
说明：
- 前 3 个节点自动分配为 **Master**
- 后 3 个节点作为 **Slave**
- 每个 Master 对应 1 个 Slave
- `--cluster-replicas 1` 表示每个主节点 1 个从节点
### 验证集群状态
查看集群信息：
```shell
redis-cli -a 123456 CLUSTER INFO
```
重点字段：
- `cluster_state: ok`
- `cluster_slots_assigned: 16384`
- `cluster_slots_ok: 16384`

查看节点与 slot 分布：
```shell
redis-cli -a 123456 CLUSTER NODES
```

集群访问方式
```shell
redis-cli -a 123456 -c -h 10.0.0.101 -p 6379
```

### 集群故障转移测试

#### 停止一个 Master（如 10.0.0.101）
```shell
systemctl stop redis
```
#### 观察集群状态
```shell
redis-cli -a 123456 CLUSTER NODES
```
现象：
- 对应 Slave 自动晋升为 Master
- Slot 自动接管
- 集群仍保持 `ok`
#### 恢复原 Master
```shell
systemctl start redis
```
原 Master 会以 **Slave** 身份重新加入集群。

---

### 扩容实操
#### 扩容目标说明

当前集群：
- 3 个 Master
- 3 个 Slave

扩容后目标：
- 新增 1 个 Master：10.0.0.107
- 新增 1 个 Slave：10.0.0.108
- 形成 4 Master + 4 Slave
#### 配置文件准备
`redis.conf` 关键项（与集群节点一致）
```shell
bind 0.0.0.0
port 6379
protected-mode yes
requirepass 123456

daemonize no
supervised systemd

dir /apps/redis/data
logfile /apps/redis/log/redis.log
pidfile /apps/redis/run/redis_6379.pid

cluster-enabled yes
cluster-config-file nodes-6379.conf
cluster-require-full-coverage no
```
重新启动 Redis（两台都执行）
```shell
systemctl restart redis
```
#### 添加 107（作为 Master）
在任意已存在节点执行（如 101）：
```shell
redis-cli --cluster add-node 10.0.0.107:6379 10.0.0.101:6379
```
此时：
- 107 已加入集群
- **尚未分配 slot**
- 状态：`master (0 slots)`
#### 添加 108（作为 Slave）

```bash
redis-cli -a 123456 --cluster add-node \
10.0.0.108:6379 10.0.0.101:6379 --cluster-slave
```

将 108 指定为 107 的从节点：

```bash
redis-cli -a 123456 --cluster replicate <107-node-id>
```
#### 扩容核心步骤：重新分配 Slot

```bash
redis-cli -a 123456 --cluster reshard 10.0.0.101:6379
```

交互示例说明：

```text
How many slots do you want to move? 1365
What is the receiving node ID? <107-node-id>
Source node #1: all
Source node #2: done
Do you want to proceed? yes
```

说明：

- `1365`：示例值（16384 ÷ 4 ≈ 4096 / 再均衡）
    
- `receiving node`：107
    
- `source node`：从原有 Master 均匀迁移
    
#### 验证扩容结果

```bash
redis-cli -a 123456 CLUSTER NODES
```

预期结果：

- 107：Master，持有 slot
    
- 108：Slave，复制 107
    
- 所有 slot 覆盖完整（0–16383）
    


---

### 缩容实操
- 移除 Master：`10.0.0.107`
- 移除 Slave：`10.0.0.108`

 **缩容原则**：

> **必须先迁移 slot → 再删除节点**

#### 迁移 107 上的 Slot

```bash
redis-cli -a 123456 --cluster reshard 10.0.0.101:6379
```

交互示例：

```text
How many slots do you want to move? 1365
What is the receiving node ID? <保留的 Master node-id>
Source node #1: <107-node-id>
Source node #2: done
Do you want to proceed? yes
```

说明：

- 所有 slot 从 107 迁回原集群 Master
    
- 完成后 107 不再持有 slot
    

---

#### 删除 Slave 节点（108）

```bash
redis-cli -a 123456 --cluster del-node \
10.0.0.101:6379 <108-node-id>
```

---

#### 删除 Master 节点（107）

```bash
redis-cli -a 123456 --cluster del-node \
10.0.0.101:6379 <107-node-id>
```

---

#### 验证缩容结果

```bash
redis-cli -a 123456 CLUSTER NODES
redis-cli -a 123456 CLUSTER INFO
```

确认：

- 107 / 108 不存在
    
- `cluster_state: ok`
    
- 所有 slot 覆盖完整
    
### 扩容与缩容核心总结

- **扩容 = add-node + reshard**
    
- **缩容 = reshard + del-node**
    
- slot 是集群的“生命线”
    
- Slave 永远不直接持有 slot
    
- Cluster 不依赖 Sentinel

---
## 面试问题
##### Redis 在什么场景下使用？

Redis 是一种内存级的 Key-Value 数据存储，它最核心的优势是**极高的读写性能与低延迟**。因此我们通常用它做热点数据缓存、计数器、分布式锁、排行榜、会话管理等需要高并发访问的场景。它也可用作轻量消息队列（基于 List 或 Stream），但它不是关系型数据库，适合处理易于丢失的缓存数据，而不是强事务场景。

---

##### 你怎么监控 Redis 是否出现故障？

生产环境 Redis 主要从两个维度监控：性能指标和可用状态。性能指标包括 CPU、内存使用、慢查询、命中率等，可以通过 Zabbix、Prometheus 等采集 `INFO` 输出。可用性监控通过定时 PING 或尝试小读写操作判断响应，并结合 Sentinel 监控节点状态和自动故障转移。此外告警逻辑通常包括长时间阻塞、OOM、持久化失败等。

---

##### 假设客户端 timeout 报错骤增，你会怎么排查？

当出现大量 timeout，我会先看**是 Redis 端还是网络延迟**导致。先确认 Redis 负载情况：CPU、内存、慢查询，检查是否有大键、长命令阻塞主线程。再看持久化操作是否正在执行，比如 bgsave 或 AOF rewrite 导致 fork 引起延迟。排查网络抖动或丢包也很关键。根据定位逐层缩减范围，先排服务端，再网络，再客户端配置。

---

##### pipeline 是什么？为什么能提升性能？

pipeline 是一种客户端批量发送命令、一次性返回结果的机制。它提升性能的本质是**减少网络 RTT 和系统调用次数**。单连接发送 N 条命令，如果逐条等待返回，网络延迟会累加；在 pipeline 下所有命令一次性发送，然后统一读取响应，极大提高了吞吐。

---

##### 本地 redis-cli 访问远程 Redis 出错，常见原因有哪些？

常见错误往往不是命令错，而是网络与安全配置不当。比如 Redis 配置 `bind` 只监听 localhost、没有关闭 protected mode、未开放防火墙端口、密码认证错误或客户端没有执行 AUTH 等。此外如果访问集群模式节点没有加 `-c`，也可能收到 MOVED/ASK 附带重定向。

---

##### 如果某个 key 很大或者单 key QPS 很高，会有什么后果？

大的单 key 和极高 QPS 会显著影响 Redis 的单线程执行。大 key 操作会阻塞主线程，导致延迟激增影响整体服务；高频访问同一 key 会让 Redis 调度倾斜，其他命令响应变慢。在客户端表现为 timeout。解决思路是**拆分 Key**、使用 pipeline、避免大对象、增加分片。

---

##### 说说 Redis 主从复制的工作原理

Redis 主从通过 PSYNC 命令实现复制。Slave 向 Master 发送 PSYNC，如果是首次，会触发全量同步，Master 生成 RDB 快照并发送给 Slave，Slave 载入后建立命令缓存；后续命令通过增量复制持续同步。断线后尽量做部分重同步，以免每次都全量同步。

---

##### Redis 如何实现高可用？哨兵（Sentinel）怎么工作？

高可用主要靠 Sentinel。Sentinel 定期向 Master/Slave 发送 PING，一旦大多数 Sentinel 认定 Master 无响应，会进入故障转移流程：选举出 Leader Sentinel，然后由 Leader Sentinel 升级某个 Slave 为新的 Master，并通知集群。Sentinel 提供主从监控、自动故障转移，以及客户端路由更新。

---

##### Redis 集群的工作原理是什么？

Redis Cluster 采用**分片机制**，全局有 16384 个 slot，写数据时通过 `CRC16(key) % 16384` 计算 slot，由某个 Master 负责这个 slot 的读写。Cluster 没有中心节点，每个节点掌握部分 slot 信息并通过 Gossip 协议传播拓扑。客户端支持 Cluster 协议，遇到 MOVED 重定向能自动访问正确节点。

---

##### 集群怎么避免脑裂？最少需要几个节点？为什么？

Cluster 通过多数派机制避免脑裂。一个 Master 节点只有在超过半数 Master 认为失联时才认为下线；failover 仅由多数 Slave 投票决定。为了能达成多数判断和保证容忍，一个合格的集群最少要**3 个 Master（最好每个有一个 Slave）**，因此常见的 6 节点（3 主 3 从）结构。

---

##### Redis 集群中槽位是多少？slot 和节点之间是什么关系？

Redis Cluster 定义了 **16384 个 slot**，这个数字是固定的。每个 Master 负责一段 slot 集合，当写入某个 key 时，先通过哈希计算出 slot，确定由哪个 Master 负责。如果某个 Master 不再负责某些 slot，可通过 reshard 操作迁移这些 slot 给其它 Master。

---

##### 集群中某节点内存显著偏大可能是什么原因？

最常见的是**slot 分布不均或热点 key 聚集**在某节点；也可能历史遗留大 key 长期没删除，或该节点作为 Slave 时还承担额外副本同步缓存。排查思路要结合 slot 区间、数据分布和命令频率。

---

##### Docker 下 Redis 如何持久化？

容器本身是无状态的，为了持久化，需要把 Redis 数据目录映射到宿主机或持久卷，如 `docker run -v /data/redis:/data redis …`。同时最好启用 AOF 或 RDB 快照，以确保容器重启数据可恢复。

---
