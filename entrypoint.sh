#!/bin/sh
set -eu

load_secret_env() {
    env_name="$1"
    secret_name="$2"
    secret_file="/run/secrets/$secret_name"

    current_value="$(eval "printf %s \"\${$env_name-}\"" )"

    if [ -n "$current_value" ]; then
        return 0
    fi

    if [ -f "$secret_file" ]; then
        secret_value="$(cat "$secret_file")"
        export "$env_name=$secret_value"
    fi
}

load_secret_env TOKEN token
load_secret_env GITHUB_USERNAME github_username
load_secret_env GITHUB_TOKEN github_token

exec "$@"
