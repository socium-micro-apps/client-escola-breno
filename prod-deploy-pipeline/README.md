# Socium-SF · prod deploy pipeline overlay

Pacote auto-contido para colocar uma app que está sendo desenvolvida localmente
em produção na infraestrutura **Socium-SF**.

**Leitor-alvo:** agente AI ou dev que está trabalhando no repo da app cliente.
Você não precisa conhecer o repo de infra; tudo necessário está aqui.

## O que esse overlay faz

Injeta no repo da sua app três artefatos:

- `docker-compose.yml` — stack que vai rodar na VPS Socium-SF
- `.github/workflows/deploy.yml` — pipeline CI/CD (build + push para `ghcr.io` + deploy via SSH)
- `.env.example` — exemplo das variáveis de ambiente

E, opcionalmente (default), executa toda a integração com GitHub: cria o repo,
gera uma chave SSH **dedicada a este cliente**, configura os 3 secrets
(`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`), e destrói a chave privada local —
ela só existe encriptada nos secrets do repo daqui em diante.

A partir do primeiro push em `main`, o pipeline cuida de tudo: builda imagem,
provisiona o diretório do cliente na VPS, sobe a stack, Traefik emite cert.

Detalhes técnicos da infra em [`INFRA-CONTEXT.md`](INFRA-CONTEXT.md).

## Pré-requisitos

No repo da app:

1. **Um `Dockerfile`** que builda a aplicação. Default: `./Dockerfile` na raiz.
   Em outro path? Você vai ajustar o workflow depois.
2. **A app respondendo HTTP em uma porta conhecida** dentro do container.
3. Não precisa de `git init` ainda — o overlay faz se necessário.

Na máquina onde o overlay vai rodar:

- `bash`, `git`, `ssh-keygen`
- `gh` ([GitHub CLI](https://cli.github.com/)) autenticado (`gh auth login`) com permissão de criar repos privados na org alvo

## Como aplicar

### Passo 1 — Extrair o overlay no repo da app

Descompacte/copie a pasta `prod-deploy-pipeline/` para dentro do repo da app:

```
seu-repo/
├── (arquivos da sua app: Dockerfile, src/, etc.)
└── prod-deploy-pipeline/
    ├── README.md          ← você está aqui
    ├── INFRA-CONTEXT.md
    ├── install.sh
    └── files/
```

> **Adicione `prod-deploy-pipeline/` ao `.gitignore`** se você não quer essa pasta no repo final. O zip é só o instalador, não precisa ser commitado.

### Passo 2 — Rodar o instalador

Do **diretório raiz do repo da app**, execute:

```bash
bash prod-deploy-pipeline/install.sh <slug>
```

Onde `<slug>` é o identificador do cliente em kebab-case (ex: `padaria-joao`).

O script:

1. Cria/sobrescreve `docker-compose.yml`, `.github/workflows/deploy.yml`, `.env.example` (substituindo `__SLUG__`, `__SUBDOMAIN__`, `__ORG__`).
2. `git init` se ainda não existe.
3. Cria o repo `socium-micro-apps/client-<slug>` (privado) no GitHub.
4. Gera uma chave SSH **dedicada a este cliente** (ed25519, sem passphrase) em `/tmp`.
5. Configura os secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` no repo.
6. **Apaga a chave privada local** (já está como secret encriptado no GitHub).
7. Imprime a **chave pública** e um one-liner SSH que o operador precisa rodar.

**Flags úteis:**

```bash
# Forçar sem perguntar (útil quando rodado por agente AI não-interativo)
INSTALL_FORCE=1 bash prod-deploy-pipeline/install.sh <slug>

# Pular toda a integração com GitHub (só cria os arquivos locais)
INSTALL_NO_GH=1 bash prod-deploy-pipeline/install.sh <slug>

# Org GitHub diferente da default
SOCIUM_ORG=outra-org bash prod-deploy-pipeline/install.sh <slug>
```

### Passo 3 — Operador autoriza a chave na VPS

Ao final, o instalador imprime algo como:

```
ssh socium-vps "grep -q 'socium-<slug>-actions' ~/.ssh/authorized_keys || echo 'ssh-ed25519 AAAA... socium-<slug>-actions' >> ~/.ssh/authorized_keys"
```

**Envie esse one-liner pro operador Socium-SF rodar uma vez.**
Não precisa de canal seguro especial — a **chave pública** não é segredo.

Sem isso, o deploy vai falhar com `Permission denied (publickey)`.

### Passo 4 — Ajustar a stack à sua app (opcional)

Antes de pushar:

- **Porta do container HTTP.** Default no compose: `80`. Se sua app escuta em outra porta (Next.js: 3000, FastAPI: 8000, etc.), edite:
  ```yaml
  - "traefik.http.services.<slug>.loadbalancer.server.port=80"
  ```
- **Dockerfile path.** Default no workflow: `./Dockerfile`. Se diferente, edite `context:` e `file:` em `.github/workflows/deploy.yml`.
- **Stack multi-serviço.** Comentários no `docker-compose.yml` mostram como adicionar `api`, `postgres`, etc.
- **Variáveis sensíveis extras** (POSTGRES_PASSWORD, API keys). Adicione ao `.env.example` (só os nomes, sem valores). O operador edita o `.env` real na VPS depois do primeiro deploy.

### Passo 5 — Push para `main`

```bash
git add docker-compose.yml .github/workflows/deploy.yml .env.example
git commit -m "Add Socium-SF prod deploy pipeline"
git push -u origin main
```

Monitor:

```bash
gh run watch --repo socium-micro-apps/client-<slug>
```

**O workflow faz tudo:**

1. Builda e publica a(s) imagem(ns) em `ghcr.io`.
2. SSH na VPS, garante que `/opt/socium-sf/clients/<slug>/` existe.
3. Sincroniza `docker-compose.yml` e `.env.example` (repo é fonte da verdade).
4. **Na primeira vez:** cria `.env` copiando de `.env.example` (chmod 600).
5. Atualiza `IMAGE_TAG` no `.env` para o sha desse commit (sem tocar em outros valores).
6. `docker compose pull` + `up -d --remove-orphans` + `image prune`.

### Passo 6 — (Se sua app precisa de segredos reais) editar o `.env` na VPS

Se seu `.env.example` lista variáveis além de `IMAGE_TAG`, peça ao operador para editar `/opt/socium-sf/clients/<slug>/.env` na VPS uma única vez com os valores reais. Próximos deploys preservam essas edições.

Apps sem segredos extras: zero intervenção manual.

### Passo 7 — Validar

```bash
curl -I https://<slug>.app.socium-sf.com
```

Espere `HTTP/2 200` com cert válido. Pushes seguintes para `main` redeployam.

## Por que chave **per-client** em vez de uma global

- A privada **nunca trafega** entre máquinas — é criada na máquina do instalador, sobe encriptada pra GitHub Secrets, e a cópia local é destruída.
- Se uma chave vazar, comprometido fica só o cliente afetado, não a infra inteira.
- Rotacionar é trivial: re-rodar `install.sh` no repo do cliente, depois pedir pro operador remover a entrada antiga do `authorized_keys` (todas têm comentário `socium-<slug>-actions`, fácil de identificar).

## Troubleshooting

Falhas comuns + comandos de diagnóstico em [`INFRA-CONTEXT.md`](INFRA-CONTEXT.md).
