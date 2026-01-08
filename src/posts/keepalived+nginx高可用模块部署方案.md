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

## Ansible配置【10.0.0.200】
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

vrrp_script check_nginx {
    script "/usr/bin/killall -0 nginx"
    interval 2
    weight -20
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
    track_script {
        check_nginx
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