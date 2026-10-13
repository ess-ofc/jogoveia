#!/usr/bin/bash

export GOCACHE="$(pwd)/.gocache"
export GOMODCACHE="$(pwd)/.gomodcache"

tsc jogo.ts
go run main.go

