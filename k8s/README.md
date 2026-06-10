# Kubernetes deployment (GitDemo)

## Prerequisites

- Docker (to build images)
- A cluster (`kind`, Minikube, Docker Desktop Kubernetes, or a hosted control plane)
- `kubectl`

## Build images

From the repository root:

```bash
docker build -f docker/Dockerfile.gateway -t pokedex-gateway:latest .
docker build -f docker/Dockerfile.pokemon -t pokedex-pokemon:latest .
docker build -f docker/Dockerfile.types -t pokedex-types:latest .
```

**kind:** load images into nodes:

```bash
kind load docker-image pokedex-gateway:latest pokedex-pokemon:latest pokedex-types:latest --name YOUR_CLUSTER_NAME
```

**Minikube:** build or load images into Minikube:

```bash
eval "$(minikube docker-env)"
docker build -f docker/Dockerfile.gateway -t pokedex-gateway:latest .
docker build -f docker/Dockerfile.pokemon -t pokedex-pokemon:latest .
docker build -f docker/Dockerfile.types -t pokedex-types:latest .
```

**Remote clusters:** push the three tags to your registry and replace `image:` values in [`24-gateway-deployment.yaml`](24-gateway-deployment.yaml), [`20-pokemon-deployment.yaml`](20-pokemon-deployment.yaml), and [`22-types-deployment.yaml`](22-types-deployment.yaml) with your fully qualified registry names; set `imagePullPolicy` to `Always` when using mutable tags.

## Apply manifests

Manifest file names start with numeric prefixes so a single **`kubectl apply -f k8s/`** runs in dependency order (`optional/` stays out of `k8s/` recursion).

Secrets in [`10-mysql-secret.yaml`](10-mysql-secret.yaml) use a demo password (`pokedex-demo-root`). Override before production (`kubectl edit secret -n pokedex-demo mysql-secret`, or regenerate with your own manifests).

Explicit apply order (matches the numeric prefixes):

```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/10-mysql-secret.yaml
kubectl apply -f k8s/11-mysql-init-configmap.yaml
kubectl apply -f k8s/12-mysql.yaml
kubectl rollout status statefulset/mysql -n pokedex-demo --timeout=180s

kubectl apply -f k8s/20-pokemon-deployment.yaml
kubectl apply -f k8s/21-pokemon-service.yaml
kubectl apply -f k8s/22-types-deployment.yaml
kubectl apply -f k8s/23-types-service.yaml

kubectl rollout status deployment/pokemon -n pokedex-demo --timeout=120s
kubectl rollout status deployment/types -n pokedex-demo --timeout=120s

kubectl apply -f k8s/24-gateway-deployment.yaml
kubectl apply -f k8s/25-gateway-service.yaml
kubectl rollout status deployment/gateway -n pokedex-demo --timeout=120s
```

`kubectl apply -f k8s/` applies only manifests in `k8s/` itself (non-recursive), so Ingress in [`optional/ingress.yaml`](optional/ingress.yaml) is not pulled in accidentally:

```bash
kubectl apply -f k8s/
```

(Optional) Apply Ingress only after installing [ingress-nginx](https://github.com/kubernetes/ingress-nginx) (or swap `ingressClassName`):

```bash
kubectl apply -f k8s/optional/ingress.yaml
```

## Verify

Port-forward (works on any cluster):

```bash
kubectl port-forward -n pokedex-demo svc/gateway-service 8080:80
curl -s http://127.0.0.1:8080/ | head
```

With Ingress, add `pokedex.demo.local` to `/etc/hosts` pointing at your ingress IP/localhost, then open `http://pokedex.demo.local/`.

## Schema source of truth

The canonical SQL file is [`mysql-init.sql`](mysql-init.sql). [`11-mysql-init-configmap.yaml`](11-mysql-init-configmap.yaml) embeds the same DDL for the MySQL init volume. If you change the schema, update both (or generate the ConfigMap with `kubectl create configmap ... --from-file=... --dry-run=client -o yaml`).

## Resetting the database

Init scripts run only on an empty data directory. To re-run DDL + allow the Pokémon worker to seed again, delete the MySQL StatefulSet PVCs and reconcile:

```bash
kubectl delete statefulset mysql -n pokedex-demo
kubectl delete pvc -n pokedex-demo data-mysql-0
kubectl apply -f k8s/12-mysql.yaml
```

Then restart Pokémon so it can observe an empty table and import the CSV (`kubectl rollout restart deployment/pokemon -n pokedex-demo`).

## docker-compose

For a single-host smoke test without Kubernetes, see the repository root [`docker-compose.yml`](../docker-compose.yml).
