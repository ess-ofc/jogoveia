FROM golang:1.27-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o server .

FROM alpine:3.20

WORKDIR /app

COPY --from=builder /app/server .

COPY manifest.json ./
COPY index.html ./
COPY jogo.js ./
COPY sw.js ./
COPY style.css ./
COPY icon.png ./

EXPOSE 8080

CMD ["./server"]

