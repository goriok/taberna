<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# taberna — Context for AI Coding Agents

## Skills disponíveis

Use estas skills para operações de deploy e verificação. Invoque com `/nome-da-skill`.

| Skill | Quando usar |
|-------|-------------|
| `/deploy` | Fazer deploy de uma nova versão para produção (testes → build → push → rollout → smoke test) |
| `/verify-version` | Verificar se a versão em produção corresponde ao HEAD local |

**Fluxo padrão após um conjunto de commits:**

```
/verify-version   → confirma que está desatualizado
/deploy           → faz o deploy
/verify-version   → confirma que o pod iniciou após o último commit
```

## Cluster

- Host: `ubuntu@201.23.81.10` (Magalu Cloud)
- Namespace: `taberna`
- Registry: `container-registry.br-se1.magalu.cloud/my-registry/taberna:latest`
- URL de produção: `https://taberna.goriok.com`
- Manifests K8s: `/Users/goriok/sources/my-cluster/k8s/apps/taberna/`

## Deploy via Taskfile

O build da imagem acontece **no cluster** (rsync → podman build no host MGC):

```bash
task deploy:all       # build imagem + apply manifests (completo)
task deploy:image     # só build/push da imagem
task deploy:cluster   # só aplicar manifests k8s
task deploy:restart   # build + rollout restart
```

## Verificar saúde

```bash
task app:health       # port-forward e checa /api/health
kubectl get pods -n taberna
kubectl logs -n taberna deploy/taberna -f --tail=50
```
