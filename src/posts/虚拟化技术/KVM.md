# Linux 内核模块与 KVM 虚拟化笔记

## 一、Linux 内核中自带的内容

Linux 内核本身包含了大量功能模块（Kernel Modules），这些模块可以按需加载或卸载，用于支持硬件驱动、文件系统、虚拟化等功能。

### 1. 查看内核模块信息

#### `modinfo` —— 查看某个内核模块的详细信息

```shell
# 显示 kvm 内核模块的详细信息
modinfo kvm
```

常见输出信息包括：

* 模块名称
* 作者
* 描述
* 版本
* 依赖关系
* 参数（parm）

**常用场景：**

* 确认某个功能是否由内核模块提供
* 查看模块是否支持当前内核版本
* 排查模块加载问题

---

#### `lsmod` —— 查看当前已加载的内核模块

```shell
# 显示当前内核中已加载的内核模块列表
lsmod
```

输出字段说明：

* **Module**：模块名称
* **Size**：模块占用的内存大小
* **Used by**：被哪些模块或进程使用

**示例用途：**

* 确认 `kvm`、`kvm_intel` 或 `kvm_amd` 是否已加载
* 排查模块冲突或依赖问题

---

## 二、rsync 常用同步命令说明

`rsync` 是 Linux 下非常强大的文件同步工具，常用于备份、数据迁移、远程同步等场景。

### 常用命令示例

```shell
rsync -avS 源地址 目的地址
```

### 参数说明

* `-a`（archive）
  归档模式，**尽可能保留文件的原始属性**，包括：

  * 权限
  * 所有者
  * 时间戳
  * 软链接等

* `-v`（verbose）
  在执行过程中**输出正在处理的文件列表**，便于观察进度和排错。

* `-S`（sparse）
  **正确处理稀疏文件**，常用于虚拟磁盘文件（如 `.qcow2`、`.img`）。

**典型使用场景：**

* 虚拟机磁盘迁移
* 数据备份
* 服务器间文件同步

---

## 三、KVM 虚拟化基础

### 1. KVM 简介

KVM（Kernel-based Virtual Machine）是 Linux 内核自带的虚拟化解决方案，通过内核模块实现：

* `kvm`
* `kvm_intel`（Intel CPU）
* `kvm_amd`（AMD CPU）

它将 Linux 内核本身变成一个 **Hypervisor**。

---

### 2. KVM 相关工具包

常见的 KVM / 虚拟化工具包包括：

* **qemu-kvm**
  提供虚拟机硬件模拟和加速能力

* **libvirt**
  虚拟化管理框架，统一管理 KVM、Xen、VMware 等

* **virt-install**
  命令行方式创建虚拟机

* **virt-manager**
  图形化虚拟机管理工具（GUI）

* **virt-viewer**
  连接虚拟机控制台

---

## 四、虚拟机创建与管理

### 1. 创建虚拟机

#### 方式一：使用 ISO 镜像安装

* 准备系统 ISO（如 CentOS、Ubuntu、Rocky Linux）
* 使用 `virt-install` 创建虚拟机
* 通过 VNC/Spice 进行系统安装

#### 方式二：导入已有本地磁盘

* 已有 `.qcow2` / `.img` 虚拟磁盘
* 直接作为虚拟机磁盘使用
* 常用于迁移或模板部署

---

### 2. 相关命令与工具

#### `virt-install`（命令行）

```shell
virt-install \
  --name test-vm \
  --memory 2048 \
  --vcpus 2 \
  --disk path=/var/lib/libvirt/images/test.qcow2,size=20 \
  --cdrom /iso/CentOS.iso \
  --os-variant centos7.0 \
  --network bridge=br0 \
  --graphics vnc
```

特点：

* 适合服务器环境
* 可脚本化、自动化
* 灵活度高

---

#### `virt-manager`（图形化）

* 桌面环境下使用
* 可视化创建、启动、关闭虚拟机
* 适合新手或运维管理

---

### 3. 虚拟机管理

常见管理操作包括：

* 启动 / 关闭 / 重启虚拟机
* 查看虚拟机状态
* 控制台连接
* 资源调整（CPU / 内存）

示例命令：

```shell
# 查看虚拟机列表
virsh list --all

# 启动虚拟机
virsh start vm_name

# 关闭虚拟机
virsh shutdown vm_name

# 强制关闭
virsh destroy vm_name
```

---

## 五、存储管理

### 1. 存储池（Storage Pool）

存储池用于统一管理虚拟机磁盘存放位置，例如：

* 目录池（dir）
* LVM
* NFS
* iSCSI

```shell
# 查看存储池
virsh pool-list --all
```

---

### 2. 存储卷（Storage Volume）

存储卷即虚拟机磁盘文件：

* `.qcow2`
* `.raw`

```shell
# 查看存储池中的卷
virsh vol-list default
```

---

## 六、虚拟磁盘管理

常见操作：

* 创建虚拟磁盘
* 扩容磁盘
* 磁盘格式转换

示例（qemu-img）：

```shell
# 创建 qcow2 磁盘
qemu-img create -f qcow2 test.qcow2 20G

# 查看磁盘信息
qemu-img info test.qcow2
```

---

## 七、网络管理

KVM 常见网络模式：

* **NAT（default）**

  * 简单易用
  * 虚拟机通过宿主机上网

* **桥接（Bridge）**

  * 虚拟机与宿主机处于同一网络
  * 常用于服务器场景

* **仅主机网络（Host-only）**

```shell
# 查看网络
virsh net-list --all
```

---

## 八、总结

* Linux 内核自带 KVM 虚拟化能力
* `modinfo`、`lsmod` 是排查内核模块的重要工具
* `rsync` 非常适合虚拟机磁盘和数据同步
* `libvirt + virsh/virt-install` 是 KVM 管理核心
* 存储与网络是虚拟化环境的关键组成部分

