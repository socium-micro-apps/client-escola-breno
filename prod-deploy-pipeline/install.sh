#!/usr/bin/env bash
# =============================================================================
# install.sh — Aplica o Socium-SF prod deploy pipeline overlay no repo atual.
#
# USO:
#   bash prod-deploy-pipeline/install.sh <slug>
#
# Variáveis de ambiente opcionais:
#   SOCIUM_ORG       Org no GitHub (default: socium-micro-apps)
#   SUBDOMAIN        Subdomínio completo (default: <slug>.app.socium-sf.com)
#   VPS_HOST         IP da VPS (default: 187.77.207.161)
#   VPS_USER         Usuário SSH na VPS (default: deploy)
#   INSTALL_FORCE=1  Não pergunta antes de sobrescrever arquivos existentes
#   INSTALL_NO_GH=1  Pula toda a integração com GitHub (modo offline; só cria os
#                    arquivos locais; útil pra debug ou quando o agente não tem
#                    `gh` autenticado)
#
# O script:
#   1) Cria/sobrescreve no diretório atual: docker-compose.yml,
#      .github/workflows/deploy.yml, .env.example (com placeholders substituídos)
#   2) [Se INSTALL_NO_GH != 1] Cria o repo no GitHub se não existir,
#      gera um par de chaves SSH ed25519 PER-CLIENT, configura os secrets
#      VPS_HOST / VPS_USER / VPS_SSH_KEY, e DESTRÓI a privada local.
#   3) Imprime a chave pública e o comando exato pro operador autorizá-la
#      no `authorized_keys` do `deploy@<VPS>` antes do primeiro push.
# =============================================================================
set -euo pipefail

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <slug>" >&2
    echo "Example: $0 padaria-joao" >&2
    exit 1
fi

SLUG="$1"
if [[ ! "$SLUG" =~ ^[a-z0-9][a-z0-9-]*[a-z0-9]$ ]]; then
    echo "ERROR: slug must be kebab-case (a-z, 0-9, dashes only), at least 2 chars" >&2
    exit 1
fi

ORG="${SOCIUM_ORG:-socium-micro-apps}"
SUBDOMAIN="${SUBDOMAIN:-${SLUG}.app.socium-sf.com}"
VPS_HOST_VALUE="${VPS_HOST:-187.77.207.161}"
VPS_USER_VALUE="${VPS_USER:-deploy}"
FORCE="${INSTALL_FORCE:-0}"
NO_GH="${INSTALL_NO_GH:-0}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FILES_DIR="$SCRIPT_DIR/files"
TARGET_DIR="$(pwd)"
REPO="${ORG}/client-${SLUG}"

if [[ ! -d "$FILES_DIR" ]]; then
    echo "ERROR: files/ directory not found at $FILES_DIR" >&2
    echo "Did you extract the full prod-deploy-pipeline.zip?" >&2
    exit 1
fi

echo "==> Installing Socium-SF prod deploy pipeline"
echo "    slug:       $SLUG"
echo "    subdomain:  $SUBDOMAIN"
echo "    org:        $ORG"
echo "    target:     $TARGET_DIR"
echo "    vps:        $VPS_USER_VALUE@$VPS_HOST_VALUE"
echo ""

# Detect files that would be overwritten
existing=()
[[ -f "$TARGET_DIR/docker-compose.yml" ]] && existing+=("docker-compose.yml")
[[ -f "$TARGET_DIR/.github/workflows/deploy.yml" ]] && existing+=(".github/workflows/deploy.yml")
[[ -f "$TARGET_DIR/.env.example" ]] && existing+=(".env.example")

if [[ ${#existing[@]} -gt 0 ]]; then
    echo "WARNING: the following file(s) already exist and will be overwritten:"
    for f in "${existing[@]}"; do echo "  - $f"; done
    if [[ "$FORCE" != "1" ]]; then
        echo ""
        read -r -p "Continue? [y/N] " ans
        [[ "$ans" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
    fi
fi

substitute() {
    sed -e "s|__SLUG__|$SLUG|g" \
        -e "s|__SUBDOMAIN__|$SUBDOMAIN|g" \
        -e "s|__ORG__|$ORG|g" \
        "$1"
}

echo "==> Writing files"
substitute "$FILES_DIR/docker-compose.yml" > "$TARGET_DIR/docker-compose.yml"
echo "  + docker-compose.yml"

mkdir -p "$TARGET_DIR/.github/workflows"
substitute "$FILES_DIR/deploy.yml" > "$TARGET_DIR/.github/workflows/deploy.yml"
echo "  + .github/workflows/deploy.yml"

substitute "$FILES_DIR/env.example" > "$TARGET_DIR/.env.example"
echo "  + .env.example"

# Soft check: warn if .env is not gitignored
if [[ -f "$TARGET_DIR/.gitignore" ]] && ! grep -qE '(^|\s)\.env(\s|$)' "$TARGET_DIR/.gitignore"; then
    echo ""
    echo "NOTE: your .gitignore does not seem to exclude .env — recommend adding:"
    echo "  .env"
elif [[ ! -f "$TARGET_DIR/.gitignore" ]]; then
    echo ""
    echo "NOTE: no .gitignore in this repo — recommend creating one with at least:"
    echo "  .env"
fi

# =============================================================================
# GitHub integration: create repo + generate per-client SSH key + set secrets
# =============================================================================
if [[ "$NO_GH" == "1" ]]; then
    cat <<EOF

============================================================
✅ Files installed (GitHub integration skipped, INSTALL_NO_GH=1)
============================================================

You'll need to manually:
  - Create the repo: gh repo create $REPO --private --source=. --remote=origin
  - Generate an SSH keypair for this client (ed25519, no passphrase)
  - Set 3 secrets in the repo: VPS_HOST, VPS_USER, VPS_SSH_KEY
  - Hand the public key to the operator to authorize on the VPS
EOF
    exit 0
fi

echo ""
echo "==> Configuring GitHub repo and secrets"

# Sanity-check tools
for tool in gh ssh-keygen git; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        echo "ERROR: required tool '$tool' not found in PATH" >&2
        if [[ "$tool" == "gh" ]]; then
            echo "  Install: https://cli.github.com/" >&2
        fi
        exit 1
    fi
done

if ! gh auth status >/dev/null 2>&1; then
    echo "ERROR: gh CLI is not authenticated. Run 'gh auth login' first." >&2
    exit 1
fi

# Ensure local git repo (so `gh repo create --source=.` works)
if [[ ! -d "$TARGET_DIR/.git" ]]; then
    echo "  - git init -b main (this directory was not a git repo)"
    git -C "$TARGET_DIR" init -b main >/dev/null
fi

# Create remote repo if it doesn't exist
if gh repo view "$REPO" >/dev/null 2>&1; then
    echo "  - Repo $REPO already exists on GitHub, skipping creation"
else
    echo "  - Creating private repo $REPO and adding 'origin' remote"
    gh repo create "$REPO" --private --source="$TARGET_DIR" --remote=origin >/dev/null
fi

# Generate per-client SSH keypair into a self-cleaning temp dir
KEY_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t socium)"
trap 'rm -rf "$KEY_DIR"' EXIT
KEY_PATH="$KEY_DIR/socium-${SLUG}-actions"

echo "  - Generating per-client ed25519 keypair"
ssh-keygen -t ed25519 -C "socium-${SLUG}-actions" -f "$KEY_PATH" -N "" >/dev/null

# Upload private key as VPS_SSH_KEY secret (stdin redirect avoids encoding issues)
echo "  - Uploading VPS_SSH_KEY secret to $REPO"
gh secret set VPS_SSH_KEY --repo "$REPO" < "$KEY_PATH"

echo "  - Uploading VPS_HOST and VPS_USER secrets"
gh secret set VPS_HOST --repo "$REPO" --body "$VPS_HOST_VALUE"
gh secret set VPS_USER --repo "$REPO" --body "$VPS_USER_VALUE"

# Capture the public key, then destroy the temp dir
PUBLIC_KEY="$(cat "$KEY_PATH.pub")"
# trap handles cleanup on exit; do it eagerly too
rm -rf "$KEY_DIR"
trap - EXIT

cat <<EOF

============================================================
✅ Pipeline overlay installed
============================================================

GitHub repo:      https://github.com/$REPO
Secrets set:      VPS_HOST, VPS_USER, VPS_SSH_KEY
Files in repo:    docker-compose.yml, .github/workflows/deploy.yml, .env.example

⚠️  ACTION REQUIRED — operator must authorize the new public key on the VPS
                     BEFORE the first push, otherwise the deploy will fail.

   Send the operator this exact one-liner (safe to share — it's the PUBLIC key):

       ssh socium-vps "grep -q 'socium-${SLUG}-actions' ~/.ssh/authorized_keys || echo '$PUBLIC_KEY' >> ~/.ssh/authorized_keys"

   (The private key was generated only in /tmp, uploaded as the VPS_SSH_KEY
    secret, and immediately destroyed. It never touched persistent disk.)

NEXT STEPS

1) Confirm Dockerfile path (default: ./Dockerfile). Edit
   .github/workflows/deploy.yml if your layout is different.

2) Confirm HTTP port in docker-compose.yml matches what your
   container listens on. Default: 80.

3) Wait until the operator confirms they've authorized the key on the VPS.

4) Commit and push:
       git add docker-compose.yml .github/workflows/deploy.yml .env.example
       git commit -m "Add Socium-SF prod deploy pipeline"
       git push -u origin main

5) Watch the deploy:
       gh run watch --repo $REPO

6) After ~1-2 min: https://$SUBDOMAIN should be live with a Let's Encrypt cert.

7) (Only if your app uses secrets beyond IMAGE_TAG) ask the operator to edit
   /opt/socium-sf/clients/$SLUG/.env on the VPS once. Future deploys preserve
   that file — the workflow only rewrites IMAGE_TAG.

Full infra context for the agent / developer: see INFRA-CONTEXT.md inside this overlay.
EOF
