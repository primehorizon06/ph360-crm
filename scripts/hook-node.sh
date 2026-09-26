#!/usr/bin/env sh
case "$(uname -s)" in
  MINGW* | MSYS* | CYGWIN*)
    root=$(pwd)
    distro=$(printf '%s' "$root" | sed -nE 's#^//wsl(\.localhost|\$)/([^/]+).*#\2#p')
    if [ -z "$distro" ]; then
      echo "El repo no está en WSL: $root" >&2
      exit 1
    fi
    path=$(printf '%s' "$root" | sed -E 's#^//wsl(\.localhost|\$)/[^/]+##')
    export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL="*"
    exec wsl.exe -d "$distro" -e bash -c 'cd "$1" && shift && . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1; exec node "$@"' _ "$path" "$@"
    ;;
  *)
    exec bash -c '. "$HOME/.nvm/nvm.sh" >/dev/null 2>&1; exec node "$@"' _ "$@"
    ;;
esac
