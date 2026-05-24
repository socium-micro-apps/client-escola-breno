# Socium-SF infra context

Contexto técnico da infraestrutura onde sua app vai rodar em produção.
Útil para o agente/dev que está configurando o pipeline.

## Visão de uma frase

Push em `main` → GitHub Actions builda imagem → publica em `ghcr.io` →
SSH no usuário `deploy` da VPS compartilhada → `docker compose pull && up -d` →
Traefik global detecta labels do container e roteia
`<slug>.app.socium-sf.com` com cert Let's Encrypt automático.

## Endereços e domínios

| Coisa | Valor |
|---|---|
| VPS pública (IP) | `187.77.207.161` |
| Hostname da VPS | `socium-sf-vps01` |
| SO | Ubuntu 24.04 LTS |
| Usuário SSH de deploy | `deploy` |
| Diretório do cliente na VPS | `/opt/socium-sf/clients/<slug>/` |
| Namespace de subdomínios | `*.app.socium-sf.com` (wildcard DNS configurado no Cloudflare) |
| Registry de imagens | `ghcr.io/<org>/client-<slug>-<image>` |
| Organização GitHub padrão | `socium-micro-apps` |
| Proxy reverso | Traefik v3.6+ |
| SSL | Let's Encrypt (HTTP-01 challenge) automático |

## Convenções obrigatórias

- **Slug:** kebab-case, único, sem acentos, sem underscores (ex: `padaria-joao`).
- **Subdomínio principal:** `<slug>.app.socium-sf.com` (NÃO mexer em DNS — coberto pelo wildcard).
- **Subdomínios extras:** `api.<slug>.app.socium-sf.com`, `admin.<slug>.app.socium-sf.com` etc. (também cobertos pelo wildcard).
- **Repo no GitHub:** `<org>/client-<slug>` (privado por padrão).
- **Nome das imagens:** `ghcr.io/<org>/client-<slug>-<image-name>` (ex: `client-padaria-joao-web`).
- **Rede compartilhada:** todos os serviços expostos por HTTP precisam estar na rede `traefik-public` (external) com `traefik.enable=true`.
- **Volumes:** sempre nomeados com prefixo `<slug>_` (ex: `padaria-joao_db_data`) para isolamento entre clientes na mesma VPS.

## Secrets do GitHub que o repo da app precisa ter

| Nome | Valor | De onde |
|---|---|---|
| `VPS_HOST` | `187.77.207.161` | constante |
| `VPS_USER` | `deploy` | constante |
| `VPS_SSH_KEY` | chave privada SSH ed25519 sem passphrase, **dedicada a este cliente** | gerada pelo `install.sh` na hora; a privada nunca persiste em disco |

O `install.sh` deste overlay configura os 3 secrets automaticamente. A chave SSH é
**per-client** — cada cliente tem o seu par. Comprometimento de uma máquina/repo
afeta só aquele cliente.

A pública (não é segredo) é impressa no terminal ao final do install, junto com
um one-liner que o operador roda na VPS para autorizar a chave no `authorized_keys`
do `deploy`. O comentário da chave é `socium-<slug>-actions` para facilitar
identificação e revogação.

## O que o operador Socium-SF faz (uma vez por cliente)

O workflow `deploy.yml` instalado por este overlay **provisiona o diretório do cliente sozinho** —
faz `mkdir`, sincroniza `docker-compose.yml` e `.env.example`, e cria `.env`
da primeira vez (a partir do `.env.example`). Pushes seguintes preservam o `.env`
existente (só atualizam `IMAGE_TAG`).

E o `install.sh` deste overlay configura sozinho os secrets do GitHub e gera a
chave SSH per-client. Então, na prática, o operador só precisa:

1. **Entregar o zip do overlay** (`prod-deploy-pipeline.zip`) ao dev/agente do cliente. Não precisa de canal seguro especial — o zip não contém segredos.
2. **Adicionar o cliente ao inventário** (`clients/inventory.md` no repo de infra).
3. **Autorizar a chave pública na VPS** rodando o one-liner que o agente do cliente vai te enviar (a pública é gerada pelo `install.sh`, na máquina dele):
   ```
   ssh socium-vps "grep -q 'socium-<slug>-actions' ~/.ssh/authorized_keys || echo 'ssh-ed25519 AAAA...' >> ~/.ssh/authorized_keys"
   ```
4. **(Condicional)** Se a app tem segredos extras (`POSTGRES_PASSWORD`, API keys, etc.), editar uma vez `/opt/socium-sf/clients/<slug>/.env` na VPS após o primeiro deploy:
   ```
   ssh socium-vps 'nano /opt/socium-sf/clients/<slug>/.env'
   ```
   Pushes subsequentes preservam essas edições.

A VPS já tem `docker login ghcr.io` configurado para o usuário `deploy`, então
ela consegue puxar imagens privadas da org sem token adicional.

### Revogando uma chave de cliente

```
ssh socium-vps "sed -i '/ socium-<slug>-actions$/d' ~/.ssh/authorized_keys"
```

Cada entrada tem o comentário `socium-<slug>-actions` (visível em `~/.ssh/authorized_keys`), o que torna trivial identificar/remover quando um cliente sai.

## Comportamento do CI/CD

O workflow `deploy.yml` instalado por este overlay:

- Dispara em `push` para `main` ou via `workflow_dispatch` manual.
- Builda a(s) imagem(ns) usando Buildx com cache do GitHub Actions.
- Publica duas tags: `:latest` e `:sha-<commit-curto>`.
- Faz SSH no `deploy@<VPS_HOST>` usando `appleboy/ssh-action`.
- No remoto: atualiza `IMAGE_TAG` no `.env`, roda `docker compose pull && up -d --remove-orphans`, depois `docker image prune -f`.

## Como o Traefik sabe sobre sua app

Traefik global lê os labels do Docker daemon. As labels do `docker-compose.yml`
deste overlay fazem o Traefik:

1. Pegar o serviço (`traefik.enable=true`).
2. Rotear `Host(<slug>.app.socium-sf.com)` para ele (router `<slug>`).
3. Pedir cert do Let's Encrypt no primeiro acesso (resolver `letsencrypt`).
4. Aplicar headers de segurança (`security-headers@docker` middleware).
5. Encaminhar para a porta interna do container (default 80, ajuste se diferente).

Não há configuração adicional do Traefik para fazer — é tudo via labels.

## O que NÃO está no escopo deste overlay

- Backup do banco do cliente (operador configura separadamente).
- Monitoramento (UptimeRobot ou similar — operador configura).
- Migrações de banco — sua app é responsável (rodar via entrypoint do container, init container, ou step extra no workflow).
- Rotação de tokens GHCR (operador faz na VPS).

## Debugando o primeiro deploy

Se algo não funcionar:

```bash
# Workflow falhou?
gh run list --repo <org>/client-<slug> --limit 5
gh run view <run-id> --repo <org>/client-<slug> --log-failed

# Imagem foi publicada?
gh api /orgs/<org>/packages/container/client-<slug>-web/versions

# Container sobe na VPS? (pedir ao operador para rodar)
ssh deploy@187.77.207.161 'cd /opt/socium-sf/clients/<slug> && docker compose ps && docker compose logs --tail=50'

# Traefik enxerga o container?
ssh deploy@187.77.207.161 'docker logs traefik --tail=50 2>&1 | grep <slug>'

# Cert foi emitido?
curl -vI https://<slug>.app.socium-sf.com 2>&1 | grep -i "issuer\|subject"
```

Falhas mais comuns:

| Sintoma | Causa provável |
|---|---|
| `ssh: no key found` no workflow | `VPS_SSH_KEY` foi setado via `Get-Content -Raw \| gh secret set` (PowerShell mexe no encoding). Setar via `cmd /c "type ... \| gh secret set ..."` ou `gh secret set ... < arquivo` (Linux/mac). |
| `denied: denied` em `docker compose pull` | A VPS perdeu o `docker login ghcr.io` (token expirou). Operador refaz. |
| 404 ao acessar `https://<slug>...` | Container não está na rede `traefik-public`, ou labels incorretas. Conferir `docker inspect <container> \| grep -A 10 Networks` na VPS. |
| Cert auto-assinado no browser | Let's Encrypt ainda não emitiu (aguardar 30-60s no primeiro acesso). Se persistir > 5min, ver logs do Traefik. |
