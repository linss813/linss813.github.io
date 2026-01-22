---
category:
  - linux
tag:
  - keepalived
  - ansible
icon: pen-to-square
date: 2026-01-08
---
# keepalived+nginx高可用模块部署方案
> 部分场景使用ansible剧本
## 环境配置

|        角色         |     IP     |    VIP     |     系统     |
| :---------------: | :--------: | :--------: | :--------: |
| Keepalived-Master | 10.0.0.200 | 10.0.0.160 | ubuntu2404 |
| Keepalived-Backup | 10.0.0.201 |            | ubuntu2404 |
|   Nginx-Master    | 10.0.0.202 |     ——     | ubuntu2404 |
|    Nginx-salve    | 10.0.0.203 |     ——     | ubuntu2404 |
|      Ansible      | 10.0.0.200 |     ——     | ubuntu2404 |

## Ansible进简单行环境配置【10.0.0.200】
### hosts清单
```shell
# /etc/ansible/hosts

# --- 1. 定义主机别名 ---
k-master  ansible_host=10.0.0.200
k-backup  ansible_host=10.0.0.201
n-master  ansible_host=10.0.0.202
n-slave   ansible_host=10.0.0.203  

# --- 2. 按照功能打标签（分组） ---
[keepalived]
k-master
k-backup

[nginx]
n-master
n-slave

[web_stack:children]
keepalived
nginx
```
### 文件准备
```shell
# /etc/ansible/playbook/vhsot.conf.j2

server {
    listen 80;
    server_name localhost;

    # 设置默认字符集，防止中文乱码
    charset utf-8;

    location / {
        root /var/www/html;
        index index.html index.htm;
        
        # 添加一些自定义 Header 方便在浏览器 F12 调试时查看
        add_header X-Backend-Server {{ inventory_hostname }};
        add_header X-Backend-IP {{ ansible_default_ipv4.address }};
    }
}
```
### playbook剧本
```shell
# /etc/ansible/playbook/setup.yml

- name: 集群基础环境与服务部署
  hosts: web_stack        
  become: yes
  tasks:
    # 1. 针对所有机器的操作
    - name: 更新系统缓存并安装基础工具 (curl, tree)
      apt:
        update_cache: yes
        name:
          - curl
          - tree
        state: present

# 2. 针对 keepalived 组的操作
- name: 部署 Keepalived 服务
  hosts: keepalived       # 直接引用 hosts 文件中的 [keepalived] 标签
  become: yes
  tasks:
    - name: 安装 keepalived
      apt:
        name: keepalived
        state: present
     
# 3. 针对 nginx 组的操作
- name: 部署 Nginx 服务
  hosts: nginx            # 直接引用 hosts 文件中的 [nginx] 标签
  become: yes
  tasks:
    - name: 安装 nginx
      apt:
        name: nginx
        state: present
    - name: conf
      template: src=./vhost.conf.j2 dest=/etc/nginx/conf.d/vhost.conf owner=www-data group=www-data
      notify: restart nginx
    - name: index.html
      shell: echo 'NGINX page FROM {{ inventory_hostname }}:{{ ansible_default_ipv4.address }}' > /var/www/html/index.html

  handlers: 
    - name: restart nginx
      service: name=nginx state=restarted
```
## keepalive相关配置
### master【10.0.0.200】
#### keepalived.conf
```shell
# /etc/keepalived/keepalived.conf

global_defs {
    router_id k-master
}

vrrp_instance VI_1 {
    state MASTER
    interface etn0
    virtual_router_id 51
    priority 100
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 1111
    }
    virtual_ipaddress {
        10.0.0.160/24 dev etn0 label etn0:1
    }
}
```
#### VIP验证
```shell
[root@ubuntu2404 ~]# ip a | grep eth0
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    inet 10.0.0.200/24 brd 10.0.0.255 scope global eth0
    inet 10.0.0.160/24 scope global secondary eth0
```

### backup【10.0.0.201】
```shell
global_defs {
   router_id k-backup
   vrrp_skip_check_adv_addr
   vrrp_strict
   vrrp_garp_interval 0
   vrrp_gna_interval 0
}

vrrp_instance VI_1 {
    state BACKUP
    interface eth0
    virtual_router_id 51
    priority 90
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 1111
    }
    virtual_ipaddress {
        10.0.0.160/24
    }
}
```
#### keepalived.conf
```shell
global_defs {
   router_id k-backup
   vrrp_skip_check_adv_addr
   vrrp_strict
   vrrp_garp_interval 0
   vrrp_gna_interval 0
}

#  
vrrp_script check_nginx {
    script "/usr/bin/killall -0 nginx"
    interval 2
    weight -20
}

vrrp_instance VI_1 {
    state BACKUP
    interface eth0
    virtual_router_id 51
    priority 90
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 1111
    }
    virtual_ipaddress {
        10.0.0.160/24
    }
    track_script{
        check_nginx
    }
}
```
#### VIP验证
```shell
停止master端的keepalived服务，在backup验证，在backup发现VIP。
重新在master开启keepalived服务,VIP飘回master

 systemctl stop keepalived.service 
 systemctl start keepalived.service 
```
## 使用 **LVS-DR (Direct Routing)** 模式

在 DR 模式中：
1. **Keepalived** 节点 (10.0.0.200/201) 不再作为 Nginx 反向代理，而是作为 LVS 调度器 (Director)，只负责转发 MAC 地址。
2. **Nginx 业务节点** (10.0.0.202/203) 称为 Real Server (RS)，它们将直接在本地回环网卡（lo）上配置 VIP，并直接响应客户端。
### 修改Keepalived 节点配置
#### Master (10.0.0.200) 配置
```shell
global_defs {
    router_id k-master
}

vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 100
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 1111
    }
    virtual_ipaddress {
        10.0.0.160/24 dev eth0 label eth0:1
    }
}

# LVS 配置
virtual_server 10.0.0.160 80 {
    delay_loop 6
    lb_algo rr        # 轮询算法
    lb_kind DR        # 指定使用 DR 模式
    persistence_timeout 30
    protocol TCP

    real_server 10.0.0.202 80 {
        weight 1
        TCP_CHECK {
            connect_timeout 3
        }
    }
    real_server 10.0.0.203 80 {
        weight 1
        TCP_CHECK {
            connect_timeout 3
        }
    }
}
```

#### Backup(10.0.0.201) 配置
```shell
global_defs {
    router_id k-backup             # 唯一标识，
    vrrp_skip_check_adv_addr
    vrrp_strict                    # 如果有特殊网络需求可关闭
    vrrp_garp_interval 0
    vrrp_gna_interval 0
}

# VRRP 实例定义
vrrp_instance VI_1 {
    state BACKUP                   # 初始状态为 BACKUP
    interface eth0                 # 确保网卡名称与实际一致
    virtual_router_id 51           # 必须与 Master 一致
    priority 90                    # 优先级必须低于 Master (100)
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass 1111             # 必须与 Master 一致
    }
    virtual_ipaddress {
        10.0.0.160/24 dev eth0 label eth0:1
    }
}

# LVS 集群配置 (与 Master 完全一致)
virtual_server 10.0.0.160 80 {
    delay_loop 6
    lb_algo rr                     # 轮询算法
    lb_kind DR                     # 必须为 DR 模式
    persistence_timeout 30          # 会话保持，测试时设为 0
    protocol TCP

    # 后端真实服务器 1
    real_server 10.0.0.202 80 {
        weight 1
        HTTP_GET { 
	        url { 
		        path / 
		        status_code 200 
		    }
            connect_timeout 3
            nb_get_retry 3
            delay_before_retry 3
        }
    }

    # 后端真实服务器 2
    real_server 10.0.0.203 80 {
        weight 1
        HTTP_GET { 
	        url { 
		        path / 
		        status_code 200 
		    }      
            connect_timeout 3
            nb_get_retry 3
            delay_before_retry 3
        }
    }
}
```

### Nginx配置

#### 抑制 ARP 响应 
- 临时生效
```shell
# 临时生效
sysctl -w net.ipv4.conf.all.arp_ignore=1
sysctl -w net.ipv4.conf.all.arp_announce=2
sysctl -w net.ipv4.conf.lo.arp_ignore=1
sysctl -w net.ipv4.conf.lo.arp_announce=2
```
- 永久生效 (写入 /etc/sysctl.conf)
```shell
# 永久生效 (写入 /etc/sysctl.conf)
cat >> /etc/sysctl.conf <<EOF
net.ipv4.conf.all.arp_ignore=1
net.ipv4.conf.all.arp_announce=2
net.ipv4.conf.lo.arp_ignore=1
net.ipv4.conf.lo.arp_announce=2
EOF
sysctl -p
```
#### 在 lo 网卡绑定 VIP 
```shell
# 在 lo 上绑定 VIP，掩码必须是 32 位 (255.255.255.255)
ip addr add 10.0.0.160/32 dev lo label lo:1
```
#### Nginx 服务调整
```shell
# /etc/nginx/conf.d/vhost.conf
server {
    listen 80;  # 或者 listen 10.0.0.160:80;
    server_name localhost;

    location / {
        root /var/www/html;
        index index.html;
        # 此时不需要 proxy_pass，直接提供服务
    }
}
```
### 验证 DR 模式
#### 检查 LVS 转发规则
在 Master (200) 上执行：`ipvsadm -Ln`
(如果没有此命令，请安装 `apt install ipvsadm`)
```shell
Prot LocalAddress:Port Scheduler Flags
  -> RemoteAddress:Port           Forward Weight ActiveConn InActConn
TCP  10.0.0.160:80 rr
  -> 10.0.0.202:80                Route   1      0          0         
  -> 10.0.0.203:80                Route   1      0          0
```
####  访问测试
从外部客户端执行 `curl 10.0.0.160`
