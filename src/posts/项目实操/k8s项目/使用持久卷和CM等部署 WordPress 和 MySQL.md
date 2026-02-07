# **三主三从k8s配置wordpress**
## 需求/环境
**在kubernetes 部署 wordpress，要安装以下组件：**
- kubernetes
- flannel
- metallb
- NFS StorageClass
- ingress-nginx

**wordpress需求**
- 独立部署deployment实现两个wordpress Pod实例实现负载均衡和高可用
- 它们使用NFS StorageClass 存储卷存储用户上传的图片或文件等数据；以ConfigMap和Secret提供必要的配置
- 部署一个MySQL数据库，使用NFS StorageClass 存储卷存储，以ConfigMap和Secret提供必要的配置
- service 暴露 wordpress 的服务
- 基于www.wang.org 域名结合ingress 暴露 wordpress 的服务
### 配置文件获取
> 后续步骤用到的yaml文件从下面地址获取
> 网址有效期至2026-06-12
> 
> ==https://www.linss.fun/resources/yaml/==




## 步骤

### 环境配置

| 机器序号 |         角色         |       主机名       |        IP        |
| :--: | :----------------: | :-------------: | :--------------: |
|  -   |       k8sapi       | k8sapi.wang.org | 10.0.0.100-(VIP) |
|  1   |     nfs-server     | master.wang.org |    10.0.0.101    |
|  -   |      Master1       | master.wang.org |    10.0.0.101    |
|  2   |      Master2       | node1.wang.org  |    10.0.0.102    |
|  3   |      Master3       | node2.wang.org  |    10.0.0.103    |
|  4   |      Worker1       | node1.wang.org  |    10.0.0.104    |
|  5   |      Worker2       | node2.wang.org  |    10.0.0.105    |
|  6   |      Worker3       | node3.wang.org  |    10.0.0.106    |
|  7   | keepalive+hayproxy |  ha1.wang.org   |    10.0.0.107    |
|  8   | keepalive+hayproxy |  ha2.wang.org   |    10.0.0.108    |


```sh
rm -f /etc/apt/sources.list.d/ubuntu.sources* && apt update 
systemctl disable apt-daily.service
systemctl disable apt-daily.timer
systemctl disable apt-daily-upgrade.service
systemctl disable apt-daily-upgrade.timer
systemctl disable  --now  unattended-upgrades
```

#### 设置主机名和host解析
```sh
hostnamectl set-hostname master1.wang.org
hostnamectl set-hostname node1.wang.org
hostnamectl set-hostname node2.wang.org
hostnamectl set-hostname node3.wang.org
hostnamectl set-hostname ha1.wang.org
```

```sh
cat > /etc/hosts << EOF
10.0.0.100 k8sapi k8sapi.wang.org 
10.0.0.101 master1 master1.wang.org
10.0.0.102 master2 master2.wang.org
10.0.0.103 master3 master3.wang.org
10.0.0.104 node1 node1.wang.org
10.0.0.105 node2 node2.wang.org
10.0.0.106 node3 node3.wang.org
10.0.0.107 ha1.wang.org ha1
10.0.0.108 ha2.wang.org ha2
10.0.0.101 nfs.wang.com
EOF
```
#### 内核配置

```sh
# 配置内核模块和参数
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter

cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sudo sysctl --system
```
#### 禁用swap
```sh
sudo swapoff -a
sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab
```

### 高可用（107、108）
#### keepalived

```sh
apt -y install keepalived 
```

```sh
cp /usr/share/doc/keepalived/samples/keepalived.conf.vrrp /etc/keepalived/keepalived.conf

vim /etc/keepalived/keepalived.conf

```
第一个节点的配置
```sh
[root@ha1 ~]# cat /etc/keepalived/keepalived.conf
global_defs {
 router_id ha1.wang.org    #指定router_id,#在ha2上为ha2.wang.org
}

vrrp_script check_haproxy {
 script "killall -0 haproxy"
 interval 1
 weight -30
 fall 3
 rise 2
 timeout 2
}

vrrp_instance VI_1 {
 state MASTER               #在ha2上为BACKUP
 interface eth0
 garp_master_delay 10
 smtp_alert
 virtual_router_id 66       #指定虚拟路由器ID,ha1和ha2此值必须相同
 priority 100               #在ha2上为80
 advert_int 1
 authentication {
  auth_type PASS
  auth_pass 123456          #指定验证密码,ha1和ha2此值必须相同
 }
 virtual_ipaddress {
  10.0.0.100/24 dev eth0 label eth0:1   #指定VIP,ha1和ha2此值必须相同
 }
 track_script {
  check_haproxy
 }
}
```

```sh
#第二个节点的配置   /etc/keepalived/keepalived.conf
[root@ha2 ~]# cat /etc/keepalived/keepalived.conf
global_defs {
 router_id ha2.wang.org    #指定router_id,#在ha1上为ha1.wang.org
}

vrrp_instance VI_1 {
 state BACKUP               #在ha1上为MASTER
 interface eth0
 garp_master_delay 10
 smtp_alert
 virtual_router_id 66       #指定虚拟路由器ID,ha1和ha2此值必须相同
 priority 80                #在ha1上为100
 advert_int 1
 authentication {
  auth_type PASS
  auth_pass 123456          #指定验证密码,ha1和ha2此值必须相同
 }
 virtual_ipaddress {
  10.0.0.100/24 dev eth0 label eth0:1   #指定VIP,ha1和ha2此值必须相同
 }
}
```

#### 实现 Haproxy
```sh
cat >> /etc/sysctl.conf <<EOF
net.ipv4.ip_nonlocal_bind = 1
EOF
sysctl -p 

apt -y install haproxy

vim /etc/haproxy/haproxy.cfg
##########添加以下内容######################
listen stats
    mode http
    bind 0.0.0.0:8888
    stats enable
    log global
    stats uri /status
    stats auth admin:123456

listen kubernetes-api-6443
    bind 10.0.0.100:6443
    mode tcp
    server master1 10.0.0.101:6443 check inter 3s fall 3 rise 3
    # 先暂时禁用 master2 和 master3，等 kubernetes 安装完成后，再启用
    # server master2 10.0.0.102:6443 check inter 3s fall 3 rise 3
    # server master3 10.0.0.103:6443 check inter 3s fall 3 rise 3
#####################################    
systemctl restart haproxy
```

浏览器访问： http://10.0.0.100:8888/status 
> admin
> 123456
> k8s集群部署完成后效果
> ![](../../../assets/Pasted%20image%2020260207114914.png)
### 安装Docker
```sh
apt install docker.io -y
```
**配置代理**
```sh
cat > /etc/docker/daemon.json <<EOF
{
    "registry-mirrors": [
        "https://docker.m.daocloud.io",
        "https://docker.ipanel.live",
        "https://docker.lms.run",
        "https://docker.xuanyuan.me"
    ],
    "insecure-registries": ["harbor.wang.org"]
}
EOF
```
### 安装 cri-dockerd(v1.24以后版本)
```sh
wget https://github.com/Mirantis/cri-dockerd/releases/download/v0.3.23/cri-dockerd-0.3.23.amd64.tgz

tar -xzf cri-dockerd-0.3.23.amd64.tgz 

mv cri-dockerd/cri-dockerd /usr/bin/ 

chmod +x /usr/bin/cri-dockerd

cri-dockerd --version
```
#### 配置service和socket
**cri-docker.service** 
```sh
[root@master ~]# cat /lib/systemd/system/cri-docker.service 
[Unit]
Description=CRI Interface for Docker Application Container Engine
Documentation=https://docs.mirantis.com
After=network-online.target firewalld.service docker.service
Wants=network-online.target
Requires=cri-docker.socket

[Service]
Type=notify
ExecStart=/usr/bin/cri-dockerd --container-runtime-endpoint fd:// --pod-infra-container-image registry.aliyuncs.com/google_containers/pause:3.10.1
ExecReload=/bin/kill -s HUP $MAINPID
TimeoutSec=0
RestartSec=2
Restart=always

StartLimitBurst=3

StartLimitInterval=60s

LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity

TasksMax=infinity
Delegate=yes
KillMode=process

[Install]
WantedBy=multi-user.target
```
**cri-docker.socket**
```sh
[root@master ~]# cat /lib/systemd/system/cri-docker.socket
[Unit]
Description=CRI Docker Socket for the API
PartOf=cri-docker.service

[Socket]
ListenStream=%t/cri-dockerd.sock
SocketMode=0660
SocketUser=root
SocketGroup=docker

[Install]
WantedBy=sockets.target
```
把文件同步到其他机器上

>实现ssh-copy-id
>https://www.linss.fun/resources/sh/ssh_key_push_all.sh

```sh
for i in {101..106}; do
    scp /lib/systemd/system/cri-docker.service 10.0.0.$i:/lib/systemd/system/cri-docker.service
    scp /lib/systemd/system/cri-docker.socket 10.0.0.$i:/lib/systemd/system/cri-docker.socket
    ssh 10.0.0.$i "systemctl daemon-reload && systemctl enable --now cri-docker.service"
done
```
### 安装k8s集群（三主三从）
```sh
apt-get update && apt-get install -y apt-transport-https


# 设置 Kubernetes 版本 
export K8S_VERSION=v1.35 

# 下载 GPG 密钥并保存到 keyring 
curl -fsSL https://mirrors.aliyun.com/kubernetes-new/core/stable/${K8S_VERSION}/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
# 添加阿里云 Kubernetes APT 源 
echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://mirrors.aliyun.com/kubernetes-new/core/stable/${K8S_VERSION}/deb/ /" | tee /etc/apt/sources.list.d/kubernetes.list

# 更新包索引 
apt-get update 

# 查看可用版本（可选） 
apt-cache madison kubeadm


apt -y install kubeadm kubelet kubectl 
apt-mark hold kubelet kubeadm kubectl docker.io

```

#### 在master1上进行初始化
```sh

# 默认的网络配置进行初始化
K8S_RELEASE_VERSION=1.35.0

kubeadm init --kubernetes-version=v${K8S_RELEASE_VERSION} \
--control-plane-endpoint k8sapi.wang.org \
--pod-network-cidr 10.244.0.0/16 \
--service-cidr 10.96.0.0/12 \
--token-ttl=0 \
--image-repository registry.aliyuncs.com/google_containers \
--upload-certs \
--cri-socket=unix:///run/cri-dockerd.sock \
--v=5
```
#### 初始化完成后续步骤
```sh
  mkdir -p $HOME/.kube
  sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
  sudo chown $(id -u):$(id -g) $HOME/.kube/config
  
 #  kubeadm join ...
 
 # 添加
--cri-socket=unix:///run/cri-dockerd.sock
```

#### 初始化失败重置
```sh
kubeadm reset -f --cri-socket=unix:///run/cri-dockerd.sock
# 强制停止所有可能还在运行的 K8s 容器
docker ps -a | grep kube | awk '{print $1}' | xargs -r docker rm -f

# 删除证书和配置
rm -rf /etc/kubernetes
# 删除 Etcd 数据（这是解决 namespace not found 的关键）
rm -rf /var/lib/etcd
# 删除 kubelet 状态
rm -rf /var/lib/kubelet
# 删除 CNI 网络插件残留
rm -rf /etc/cni/net.d
# 删除本地 kubectl 配置
rm -rf ~/.kube
```
#### 验证
```sh
[root@master1 ~]# kubectl get nodes
NAME               STATUS     ROLES           AGE     VERSION
master1.wang.org   NotReady   control-plane   4m32s   v1.35.0
master2.wang.org   NotReady   control-plane   2m27s   v1.35.0
master3.wang.org   NotReady   control-plane   87s     v1.35.0
node1.wang.org     NotReady   <none>          16s     v1.35.0
node2.wang.org     NotReady   <none>          12s     v1.35.0
node3.wang.org     NotReady   <none>          10s     v1.35.0
```
#### 配置网络和命令补全
##### 安装 Flannel 网络插件
```sh
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
```
##### 自动补全以及别名
```sh
# 1. 开启 kubectl 补全
echo 'source <(kubectl completion bash)' >> ~/.bashrc

# 2. 设置 k 别名并使其也支持补全
echo 'alias k=kubectl' >> ~/.bashrc
echo 'complete -o default -F __start_kubectl k' >> ~/.bashrc

# 3. 使配置立即生效
source ~/.bashrc
```

### metallb 实现loadBalancer SVC 功能

#### 下载并安装 MetalLB
```sh
# 定义版本号
METALLB_VERSION='v0.15.3'

# 下载清单文件
wget https://raw.githubusercontent.com/metallb/metallb/${METALLB_VERSION}/config/manifests/metallb-native.yaml

# 执行安装
kubectl apply -f metallb-native.yaml
```
#### 配置 IP 地址池
```sh
cat <<EOF > service-metallb-IPAddressPool.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: localip-pool
  namespace: metallb-system
spec:
  addresses:
  - 10.0.0.10-10.0.0.50
  autoAssign: true
  avoidBuggyIPs: true
EOF

```
#### 配置二层通告 (L2 Advertisement)
```sh
cat <<EOF > service-metallb-L2Advertisement.yaml
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: localip-pool-l2a
  namespace: metallb-system
spec:
  ipAddressPools:
  - localip-pool
  interfaces:
  - eth0
EOF

```
#### 应用配置并验证
```sh
# 应用上述两个配置文件
kubectl apply -f service-metallb-IPAddressPool.yaml \
              -f service-metallb-L2Advertisement.yaml

# 验证 Pod 状态
kubectl get all -n metallb-system
```

```sh
[root@master1 ~]# kubectl get all -n metallb-system
NAME                              READY   STATUS    RESTARTS   AGE
pod/controller-66bdd896c6-59sjt   1/1     Running   0          3m3s
pod/speaker-88mvg                 1/1     Running   0          3m3s
pod/speaker-89slz                 1/1     Running   0          3m3s
pod/speaker-kdtkm                 1/1     Running   0          3m3s
pod/speaker-lbzbk                 0/1     Running   0          3m3s
pod/speaker-rv2bn                 0/1     Running   0          3m3s
pod/speaker-xlm4z                 1/1     Running   0          3m3s

NAME                              TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)   AGE
service/metallb-webhook-service   ClusterIP   10.108.182.212   <none>        443/TCP   3m3s

NAME                     DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR            AGE
daemonset.apps/speaker   6         6         4       6            4           kubernetes.io/os=linux   3m3s

NAME                         READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/controller   1/1     1            1           3m3s

NAME                                    DESIRED   CURRENT   READY   AGE
replicaset.apps/controller-66bdd896c6   1         1         1       3m3s
```

#### 创建测试 Deployment 和 LoadBalancer 服务

##### 创建 Deployment：
```sh
kubectl create deployment myapp --image=registry.cn-beijing.aliyuncs.com/wangxiaochun/pod-test:v0.1 --replicas=3
```
###### 创建 LoadBalancer 服务配置文件：
```sh
cat <<EOF > service-loadbalancer-lbaas.yaml
apiVersion: v1
kind: Service
metadata:
  name: service-loadbalancer-lbaas
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  selector:
    app: myapp
  ports:
  - name: http
    protocol: TCP
    port: 80
    targetPort: 80
EOF

kubectl apply -f service-loadbalancer-lbaas.yaml
```
验证地址池是否能成功分配外部 IP。
```sh
[root@master1 ~]#kubectl get svc
NAME                         TYPE           CLUSTER-IP       EXTERNAL-IP   PORT(S)        AGE
kubernetes                   ClusterIP      10.96.0.1        <none>        443/TCP        22m
service-loadbalancer-lbaas   LoadBalancer   10.102.225.114   10.0.0.10     80:32633/TCP   84s
```

### NFS StorageClass 
实现 master1节点的NFS服务共享/data/sc-nfs目录,实现storageClass的动态置备

#### 创建NFS服务
```sh
# master1
apt -y install nfs-server

mkdir -pv /data/sc-nfs/

cat > /etc/exports << EOF
/data/sc-nfs *(rw,no_root_squash) 
EOF

exportfs -rv



# worker节点安装终端
apt -y install nfs-common 
```


#### 创建 ServiceAccount 并授权
使用的yaml文件：
```sh
[root@master1 ~]# ls
nfs-client-provisioner.yaml nfs-StorageClass.yaml pod-test.yaml pvc.yaml rbac.yaml
```

##### 创建独立名称空间
```sh
kubectl create ns sc-nfs
kubectl apply -f rbac.yaml

# 查看
[root@master1 ~]# kubectl get sa -n sc-nfs
NAME                     SECRETS   AGE
default                  0         34d
nfs-client-provisioner   0         9s
```

#### 部署 NFS-Subdir-External-Provisioner 对应的Deployment
```sh
kubectl apply -f nfs-client-provisioner.yaml

[root@master1 ~]# kubectl get deployments.apps -n sc-nfs
NAME                     READY   UP-TO-DATE   AVAILABLE   AGE
nfs-client-provisioner   1/1     1            1           5m26s

[root@master1 ~]# kubectl get pod -n sc-nfs
NAME                                     READY   STATUS   RESTARTS   AGE
nfs-client-provisioner-7468dcd749-24lpv   1/1     Running   0         5m34s
```

#### 创建 NFS 资源的 StorageClass

```sh
kubectl apply -f nfs-StorageClass.yaml
```

#### 创建 PVC
```sh
kubectl apply -f pvc.yaml 
```

#### 创建 Pod

```sh
kubectl apply -f pod-test.yaml
```
pod-test.yaml
```sh
[root@master1 ~]# cat pod-test.yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod-nfs-sc-test
spec:
  containers:
  - name: pod-nfs-sc-test
    image: registry.cn-beijing.aliyuncs.com/wangxiaochun/nginx:1.20.0
    volumeMounts:
      - name: nfs-pvc
        mountPath: "/usr/share/nginx/html/"
  restartPolicy: "Never"
  volumes:
    - name: nfs-pvc
      persistentVolumeClaim:
        claimName: pvc-nfs-sc  #指定前面创建的PVC名称
```
#### 删除Pod和PVC 
```sh
#先删除Pod
kubectl delete -f pod-test.yaml 

#再删除PVC
kubectl delete -f pvc.yaml 


#自动删除了对应的PV
kubectl get pv
kubectl get pvc

#对应的数据不会删除,仍保留
ls /data/sc-nfs/
```
### 创建ingress
ngress-nginx 部署实现ingress
```sh
kubectl apply -f ingress-wordpress.yaml
```
```sh
[root@master1 wordpress]# cat ingress-wordpress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-wordpress
  #annotations:
  #  kubernetes.io/ingress.class: "nginx" ,k8s-v1.32.0不支持
spec:
  ingressClassName: nginx   #新版建议使用此项指定controller类型
  rules:
  - host: www.wang.org
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: wordpress
            port: 
              number: 80
```

### 加载mysql和wordpress
```sh
kubectl apply -f storage-wordpress-mysql.yaml 
kubectl apply -f storage-wordpress-wordpress.yaml
```


## yaml文件


###### **rbac.yaml**
```sh
[root@master1 ~]# cat rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: nfs-client-provisioner
  # replace with namespace where provisioner is deployed
  #namespace: default
  namespace: sc-nfs
---
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: nfs-client-provisioner-runner
rules:
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["persistentvolumes"]
    verbs: ["get", "list", "watch", "create", "delete"]
  - apiGroups: [""]
    resources: ["persistentvolumeclaims"]
    verbs: ["get", "list", "watch", "update"]
  - apiGroups: ["storage.k8s.io"]
    resources: ["storageclasses"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["create", "update", "patch"]
---
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: run-nfs-client-provisioner
subjects:
  - kind: ServiceAccount
    name: nfs-client-provisioner
    # replace with namespace where provisioner is deployed
    #namespace: default
    namespace: sc-nfs
roleRef:
  kind: ClusterRole
  name: nfs-client-provisioner-runner
  apiGroup: rbac.authorization.k8s.io
---
kind: Role
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: leader-locking-nfs-client-provisioner
  # replace with namespace where provisioner is deployed
  #namespace: default
  namespace: sc-nfs
rules:
  - apiGroups: [""]
    resources: ["endpoints"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
---
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: leader-locking-nfs-client-provisioner
  # replace with namespace where provisioner is deployed
  #namespace: default
  namespace: sc-nfs
subjects:
  - kind: ServiceAccount
    name: nfs-client-provisioner
    # replace with namespace where provisioner is deployed
    #namespace: default
    namespace: sc-nfs
roleRef:
  kind: Role
  name: leader-locking-nfs-client-provisioner
  apiGroup: rbac.authorization.k8s.io
```
###### **nfs-client-provisioner.yaml**
```sh
[root@master1 ~]# cat nfs-client-provisioner.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nfs-client-provisioner
  labels:
    app: nfs-client-provisioner
  # replace with namespace where provisioner is deployed
  #namespace: default
  namespace: sc-nfs
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: nfs-client-provisioner
  template:
    metadata:
      labels:
        app: nfs-client-provisioner
    spec:
      serviceAccountName: nfs-client-provisioner
      containers:
        - name: nfs-client-provisioner
          image: registry.cn-beijing.aliyuncs.com/wangxiaochun/nfs-subdir-external-provisioner:v4.0.2
          #image: wangxiaochun/nfs-subdir-external-provisioner:v4.0.2
          #image: k8s.gcr.io/sig-storage/nfs-subdir-external-provisioner:v4.0.2
          imagePullPolicy: IfNotPresent
          volumeMounts:
            - name: nfs-client-root
              mountPath: /persistentvolumes
          env:
            - name: PROVISIONER_NAME
              value: k8s-sigs.io/nfs-subdir-external-provisioner #名称确保与 nfs-StorageClass.yaml文件中的provisioner名称保持一致
            - name: NFS_SERVER
              value: nfs.wang.org # NFS SERVER_IP 
            - name: NFS_PATH
              value: /data/sc-nfs  # NFS 共享目录
      volumes:
        - name: nfs-client-root
          nfs:
            server: nfs.wang.org  # NFS SERVER_IP 
            path: /data/sc-nfs  # NFS 共享目录
```
###### **fs-StorageClass.yaml**
```sh
[root@master1 ~]#cat nfs-StorageClass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: sc-nfs 
  annotations:
    storageclass.kubernetes.io/is-default-class: "false"  # 是否设置为默认的storageclass
provisioner: k8s-sigs.io/nfs-subdir-external-provisioner # or choose another name, must match deployment's env PROVISIONER_NAME'
parameters:
  archiveOnDelete: "true" # 设置为"false"时删除PVC不会保留数据,"true"则保留数据
```
###### **pvc.yaml** 
```sh
[root@master1 ~]# cat pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pvc-nfs-sc
spec:
  storageClassName: sc-nfs  #需要和前面创建的storageClass名称相同
  accessModes: ["ReadWriteMany","ReadOnlyMany"]
  resources:
    requests:
      storage: 100Mi
```
###### **storage-wordpress-mysql.yaml** 
```sh
[root@master1 wordpress]#cat storage-wordpress-mysql.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysql-pass
type: kubernetes.io/basic-auth
#type: Opaque  #也可以用Opaque类型
data:
  password: MTIzNDU2             #key名称:password,value为123456
  
---
apiVersion: v1
kind: Service
metadata:
  name: wordpress-mysql
  labels:
    app: mysql
spec:
  ports:
    - port: 3306
  selector:
    app: wordpress
    tier: mysql
  clusterIP: None
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-pv-claim
  labels:
    app: wordpress
spec:
  storageClassName: sc-nfs  #需要和前面创建的storageClass名称相同,如果是默认的storageClass,此项可选
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wordpress-mysql
  labels:
    app: wordpress
spec:
  selector:
    matchLabels:
      app: wordpress
      tier: mysql
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: wordpress
        tier: mysql
    spec:
      containers:
      - image: registry.cn-beijing.aliyuncs.com/wangxiaochun/mysql:8.0.29-oracle
        name: mysql
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-pass
              key: password
        - name: MYSQL_DATABASE
          value: wordpress
        - name: MYSQL_USER
          value: wordpress
        - name: MYSQL_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-pass
              key: password
        ports:
        - containerPort: 3306
          name: mysql
        volumeMounts:
        - name: mysql-persistent-storage
          mountPath: /var/lib/mysql
      volumes:
      - name: mysql-persistent-storage
        persistentVolumeClaim:
          claimName: mysql-pv-claim
```
###### **storage-wordpress-wordpress.yaml** 
```sh
[root@master1 wordpress]#cat storage-wordpress-wordpress.yaml
apiVersion: v1
kind: Service
metadata:
  name: wordpress
  labels:
    app: wordpress
spec:
  ports:
    - port: 80
  selector:
    app: wordpress
    tier: frontend
  type: LoadBalancer
  sessionAffinity: ClientIP    #会话保持
  externalTrafficPolicy: Local #DNAT
  #type: ClusterIP  #如何部署了ingress可以使用此项
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: wp-pv-claim
  labels:
    app: wordpress
spec:
  storageClassName: sc-nfs  #需要和前面创建的storageClass名称相同,如果是默认的storageClass,此项可选
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 20Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wordpress
  labels:
    app: wordpress
spec:
  replicas: 2
  selector:
    matchLabels:
      app: wordpress
      tier: frontend
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: wordpress
        tier: frontend
    spec:
      containers:
      - image: registry.cn-beijing.aliyuncs.com/wangxiaochun/wordpress:php8.2-apache
        name: wordpress
        env:
        - name: WORDPRESS_DB_HOST
          value: wordpress-mysql
        - name: WORDPRESS_DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-pass
              key: password
        - name: WORDPRESS_DB_USER
          value: wordpress
        ports:
        - containerPort: 80
          name: wordpress
        volumeMounts:
        - name: wordpress-persistent-storage
          mountPath: /var/www/html  #此方式性能较差
          #mountPath: /var/www/html/wp-content/uploads #此方式性能较好，wordpress的配置不能实现多个Pod同步
      volumes:
      - name: wordpress-persistent-storage
        persistentVolumeClaim:
          claimName: wp-pv-claim
```