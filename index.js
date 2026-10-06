function reagirÀCélula(event) {
    const botão = event.target;
    botão.innerText = 'X';
    botão.disabled = true;
}

function desenharTabuleiro() {
    const tabuleiro = document.getElementById('tabuleiro');
    for (let i = 0; i < 9; i++) {
        const botão = document.createElement('button');
        botão.addEventListener(
            'click',
            reagirÀCélula
        );

        tabuleiro.appendChild(botão);
    }
}

desenharTabuleiro();
