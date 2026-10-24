package main

import (
	"fmt"
	"math/rand/v2"
	"net/http"
	"sync"
	"os"

	"golang.org/x/net/websocket"
)

type Status struct {
	Apelido string `json:"apelido"`
	Livre   bool   `json:"livre"`
}

type Msg struct {
	Tipo      string    `json:"tipo"`
	Texto     string    `json:"texto"`
	X         int       `json:"x"`
	Y         int       `json:"y"`
	Jogadores []Status  `json:"jogadores"`
	Vez       string    `json:"vez"`
	Tab       [3][3]int `json:"tab"`
}

type Sala struct {
	mtx         *sync.Mutex
	j1, j2, vez *Jogador
	tab         [3][3]int // 0 = niguém, 1 = x, 2 = o
}

type Jogador struct {
	apelido string
	sala    *Sala
	ws      *websocket.Conn
	sim     int
}

var (
	clientela = make(map[string]*Jogador)
	mtx       = &sync.Mutex{}
)

func novaSala(j1, j2 *Jogador) {
	sala := &Sala{
		j1: j1,
		j2: j2,
	}
	j1.sala, j2.sala = sala, sala

	if rand.N(2) == 0 {
		j1.sim, j2.sim = 1, 2
	} else {
		j1.sim, j2.sim = 2, 1
	}
	if rand.N(2) == 0 {
		sala.vez = j1
	} else {
		sala.vez = j2
	}
	atualizarLista()
	sala.atualizar()
}

func (s *Sala) atualizar() {
	msg := Msg{
		Tipo: "tabuleiro",
		Tab:  s.tab,
		Vez:  s.vez.apelido,
	}
	websocket.JSON.Send(s.j1.ws, msg)
	websocket.JSON.Send(s.j2.ws, msg)
}

func (s *Sala) venceu(sim int) bool {
	for i := range 3 {
		if s.tab[i][0] == sim && s.tab[i][1] == sim && s.tab[i][2] == sim {
			return true
		}
		if s.tab[0][i] == sim && s.tab[1][i] == sim && s.tab[2][i] == sim {
			return true
		}
	}

	return (s.tab[0][0] == sim && s.tab[1][1] == sim && s.tab[2][2] == sim) ||
		(s.tab[0][2] == sim && s.tab[1][1] == sim && s.tab[2][0] == sim)
}

func (s *Sala) cheio() bool {
	for _, l := range s.tab {
		for _, c := range l {
			if c == 0 {
				return false
			}
		}
	}
	return true
}

func (s *Sala) fim(j *Jogador) {
	if j == nil {
		websocket.JSON.Send(s.j1.ws, Msg{Tipo: "velha"})
		websocket.JSON.Send(s.j2.ws, Msg{Tipo: "velha"})
	} else {
		websocket.JSON.Send(j.ws, Msg{Tipo: "venceu"})
		if j == s.j1 {
			websocket.JSON.Send(s.j2.ws, Msg{Tipo: "perdeu"})
		} else {
			websocket.JSON.Send(s.j1.ws, Msg{Tipo: "perdeu"})
		}
	}

	s.j1.sala, s.j2.sala = nil, nil
	atualizarLista()
}

func (s *Sala) passe(j *Jogador, x, y int) {
	s.tab[x][y] = s.vez.sim

	if s.venceu(j.sim) {
		s.fim(j)
		return
	}

	if s.cheio() {
		s.fim(nil)
		return
	}

	if j == s.j1 {
		s.vez = s.j2
	} else {
		s.vez = s.j1
	}
	s.atualizar()
}

func enviar(msg Msg) {
	for _, c := range clientela {
		websocket.JSON.Send(c.ws, msg)
	}
}

func atualizarLista() {
	msg := Msg{
		Tipo:      "atualizar",
		Jogadores: make([]Status, 0, len(clientela)),
	}
	for _, c := range clientela {
		msg.Jogadores = append(msg.Jogadores, Status{
			Apelido: c.apelido,
			Livre:   c.sala == nil,
		})
	}
	enviar(msg)
}

func gerenciarConexão(ws *websocket.Conn) {
	apelido := ""
	defer ws.Close()

	for {
		var msg Msg
		err := websocket.JSON.Receive(ws, &msg)
		if err != nil {
			if apelido != "" {
				mtx.Lock()
				if j := clientela[apelido]; j.sala != nil {
					if j == j.sala.j1 {
						j.sala.fim(j.sala.j2)
					} else {
						j.sala.fim(j.sala.j1)
					}
				}
				delete(clientela, apelido)
				mtx.Unlock()

				atualizarLista()
			}

			break
		}

		mtx.Lock()
		switch msg.Tipo {
		case "login":
			_, ok := clientela[msg.Texto]
			if ok {
				websocket.JSON.Send(ws, Msg{Tipo: "existe"})
				break
			}

			apelido = msg.Texto
			clientela[apelido] = &Jogador{
				apelido: apelido,
				ws:      ws,
			}
			atualizarLista()
		case "convidar":
			websocket.JSON.Send(
				clientela[msg.Texto].ws,
				Msg{Tipo: "convite", Texto: apelido},
			)
		case "aceitar":
			j1, j2 := clientela[apelido], clientela[msg.Texto]
			if j2 != nil && j2.sala == nil {
				novaSala(j1, j2)
			}
		case "negar":
			websocket.JSON.Send(
				clientela[msg.Texto].ws,
				Msg{Tipo: "recusar", Texto: apelido},
			)
		case "passe":
			j := clientela[apelido]
			j.sala.passe(j, msg.X, msg.Y)
		case "desistir":
			j := clientela[apelido]
			if j == j.sala.j1 {
				j.sala.fim(j.sala.j2)
			} else {
				j.sala.fim(j.sala.j1)
			}
		}
		mtx.Unlock()
	}
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

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

	fmt.Println("Servindo na porta", port)
	http.ListenAndServe("0.0.0.0:"+port, nil)
}
