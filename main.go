package main

import (
	"fmt"
	"math/rand/v2"
	"net/http"
	"sync"

	"golang.org/x/net/websocket"
)

type Sala struct {
	J1        *Jogador   // X
	J2        *Jogador   // Bola
	tabuleiro [3][3]rune // 0 = ninguém, 'x' = X e 'o' = bola.
	vez       *Jogador
}

func NewSala(j1 *Jogador, j2 *Jogador) {
	sala := Sala{
		J1: j1,
		J2: j2,
	}
	j1.SalaAtual = &sala
	j2.SalaAtual = &sala
	if rand.N(2) == 0 {
		j1.marca = 'x'
		j2.marca = 'o'
	} else {
		j1.marca = 'x'
		j2.marca = 'o'
	}
	if rand.N(2) == 0 {
		sala.vez = j1
	} else {
		sala.vez = j2
	}

	websocket.JSON.Send(
		sala.vez.ws,
		Msg{
			Tipo:      "jogar",
			Tabuleiro: sala.tabuleiro,
		},
	)
}

func (s *Sala) FazerPasse(x, y int) {
	s.tabuleiro[x][y] = s.vez.marca
	if s.vez == s.J1 {
		s.vez = s.J2
	} else {
		s.vez = s.J2
	}
	websocket.JSON.Send(
		s.vez.ws,
		Msg{
			Tipo:      "jogar",
			Tabuleiro: s.tabuleiro,
		},
	)
}

type Jogador struct {
	Apelido   string
	ws        *websocket.Conn
	SalaAtual *Sala
	marca     rune
}

type Status struct {
	Apelido string `json:"apelido"`
	Livre   bool   `json:"livre"`
}

type Msg struct {
	Tipo      string     `json:"tipo"`
	Texto     string     `json:"texto"`
	Jogadores []Status   `json:"jogadores"`
	Online    int        `json:"online"`
	X         int        `json:"x"`
	Y         int        `json:"y"`
	Tabuleiro [3][3]rune `json:"tabuleiro"`
}

var (
	clientela = make(map[string]Jogador)
	online    = 0
	mutex     = &sync.Mutex{}
)

func enviar(msg Msg) {
	mutex.Lock()
	defer mutex.Unlock()
	for _, v := range clientela {
		websocket.JSON.Send(v.ws, msg)
	}
}

func atualizarLista() {
	msg := Msg{
		Tipo:      "atualizar",
		Jogadores: make([]Status, 0, len(clientela)),
		Online:    len(clientela),
	}
	for _, v := range clientela {
		msg.Jogadores = append(
			msg.Jogadores, Status{
				Apelido: v.Apelido,
				Livre:   v.SalaAtual == nil,
			},
		)
	}
	enviar(msg)
}

func gerenciarConexão(ws *websocket.Conn) {
	defer ws.Close()

	apelido := ""

	// Escutar mensagens.
	for {
		var msg Msg
		err := websocket.JSON.Receive(ws, &msg)
		if err != nil {
			if apelido != "" {
				mutex.Lock()
				delete(clientela, apelido)
				online = len(clientela)
				mutex.Unlock()
			}

			atualizarLista()
			break
		}

		switch msg.Tipo {
		case "passe":
			j := clientela[apelido]
			if s := j.SalaAtual; s != nil {
				s.FazerPasse(msg.X, msg.Y)
			}

			panic("Jogador '" + j.Apelido + "' está sem sala.")
		case "login":
			mutex.Lock()
			_, ok := clientela[msg.Texto]
			if ok {
				websocket.JSON.Send(ws, Msg{Tipo: "existe"})
				mutex.Unlock()
				break
			}

			apelido = msg.Texto
			clientela[apelido] = Jogador{
				Apelido: apelido,
				ws:      ws,
			}
			mutex.Unlock()

			atualizarLista()
		case "convidar":
			j := clientela[msg.Texto]
			websocket.JSON.Send(j.ws, Msg{Tipo: "convite", Texto: apelido})
		case "aceitar":
			j := clientela[msg.Texto]
			websocket.JSON.Send(j.ws, Msg{Tipo: "aceitar", Texto: apelido})
		}
	}
}

func main() {
	wsServer := websocket.Server{
		Handler: websocket.Handler(gerenciarConexão),
		Handshake: func(confg *websocket.Config, r *http.Request) error {
			return nil
		},
	}
	http.Handle("/ws", wsServer)

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.FileServer(http.Dir(".")).ServeHTTP(w, r)
			return
		}
		http.ServeFile(w, r, "index.html")
	})

	fmt.Println("Servindo...")
	http.ListenAndServe(":8080", nil)
}
