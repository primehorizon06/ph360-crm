#!/usr/bin/env sh
RUN_NODE='
bin=$(ls -d "$HOME"/.nvm/versions/node/*/bin 2>/dev/null | sort -V | tail -n 1)
if [ -n "$bin" ]; then
  PATH="$bin:$PATH"
elif [ -s "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
fi
exec node "$@"
'

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
    exec wsl.exe -d "$distro" -e bash -c "cd \"\$1\" && shift && $RUN_NODE" _ "$path" "$@"
    ;;
  *)
    exec bash -c "$RUN_NODE" _ "$@"
    ;;
esac
