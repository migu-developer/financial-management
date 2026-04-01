#!/usr/bin/env bash

[[ -f ./config/.env.development ]] || touch config/.env.development

[[ -f ./config/.env.production ]] || touch config/.env.production

if [[ ! -f ./config/.env.local ]]; then
  echo "Copying default environment variables..."
  cp ./config/.env.defaults ./config/.env.local
fi
