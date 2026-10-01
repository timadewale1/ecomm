#!/usr/bin/env bash

set -e

live_reload_port=5173

./node_modules/.bin/vite --host 0.0.0.0 --port "$live_reload_port" &
vite_process_id=$!

cleanup_live_reload() {
  kill "$vite_process_id" 2>/dev/null || true
}

trap cleanup_live_reload EXIT INT TERM

while ! nc -z 127.0.0.1 "$live_reload_port" 2>/dev/null; do
  sleep 0.2
done

./node_modules/.bin/capacitor run ios --live-reload --port "$live_reload_port"
