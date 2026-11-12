# Mapa-mundi-FU

Módulo para **Foundry VTT v13** que transforma a ficha de mapa de *Fabula Ultima* (World Sheets) num mapa-múndi vivo da campanha. O mestre colore e decora o mapa. Todos os jogadores o veem ao vivo, mas só o mestre edita.

## Como abrir

- Botão **Mapa-múndi** nos controles de Token (barra da esquerda), visível para todos.
- Botão **Mapa-múndi** no topo da aba Diário.
- Atalho de teclado (sem tecla padrão; defina em Configurar Controles).
- Macro: `game.modules.get("mapa-mundi-fu").api.open()`.

O mapa fica salvo no mundo como "mapa-múndi", numa configuração do mundo (não em cena). O mestre pode abri-lo na tela de todos com o botão de pessoas na barra do mapa.

## O que o mestre pode fazer

**Base do mapa** (aba Mapa)
- Os dois mapas das World Sheets: o da última página (padrão) e o da página 2, com contorno vetorizado. A grade é 30 × 20, como na ficha, e cada terra pode ser pintada separadamente.
- **Continentes gerados**, com seis formas (continentes, supercontinente, dois continentes, anel ao redor de um mar, arquipélago, ilhas flutuantes), quantidade de terra, recorte do litoral, ilhas pequenas e semente.
- Só o mar, para desenhar tudo à mão.
- **Imagem própria**: qualquer imagem do servidor, com encaixe preencher, inteira ou esticar.

**Estilo**
- 11 temas: Ficha original, Pergaminho, Carta antiga (gravura), Aquarela, Mundo vibrante, Noite arcana, Ilhas no céu (com penhascos), Era do gelo, Terras sombrias, Holograma e Verão.
- Cores próprias para mar, terra e litoral.
- Enfeites que ligam e desligam: grade, linhas de rumo, rosa dos ventos, escala de dias de viagem, cabeçalho (Mundo, Mapa nº, Região), moldura, ondas na costa, ondinhas animadas no mar, nuvens passando e vinheta.

**Colorir**
- **Balde**: clique numa terra para pintá-la ou no mar para mudar a cor do mar. Alt+clique copia uma cor.
- **Pincel**: tamanho, opacidade e suavidade. Pode pintar em todo lugar, só na terra ou só no mar.
- **Pincel de textura**, 16 padrões: floresta, pinheiros, grama, colinas, dunas, pântano, pedras, neve, gelo rachado, lava, ondas, cristais, hachuras, pontilhado e escamas.
- **Borracha**.
- Paleta com 36 cores de terreno e as cores usadas por último.

**Carimbos** (82 desenhos originais, coloríveis)
- Relevo, vegetação, águas, lugares (vila, cidade, capital, castelo, torre, porto, templo, ruínas, farol, mina, fábrica, caverna...), mistérios (portal, obelisco, ilha flutuante, cristal sagrado, árvore do mundo, fenda no céu...), monstros (dragão, serpente marinha, kraken, golem, geleia, ave colossal, demônio, fantasma...), veículos (navio, aeronave, trem, balão) e marcadores.
- Cada carimbo tem tamanho, giro, espelho, duas cores, opacidade, animação e **aura de mana latente**.
- Com "espalhar ao arrastar", dá para semear florestas e cordilheiras inteiras.

**Nomes**
- Qualquer fonte carregada no Foundry, inclusive as que o mestre adicionou, e mais algumas do sistema.
- Tamanho, cor, contorno, curva em arco, giro e espaçamento.
- 16 efeitos: brilho, cintilar, dourado, arco-íris, fogo, gelo, elétrico, sombra, fantasma, pulsar, flutuar, onda, runas, revelar letra a letra e arcano.
- Botão para sortear nomes de lugares (gerador próprio).

**Efeitos de área**
- **Mana latente** nos oito elementos (ar, raio, trevas, terra, fogo, gelo, luz, veneno), com as mesmas cores do Atlas de Cartas.
- Outros efeitos: névoa, tempestade, redemoinho, aurora, luzes de fada, fumaça, chuva, nevasca, miasma, farol, portal, brasas, estrelas cadentes, pulso de alerta e bolhas.

**Rotas e regiões**
- Rotas: estrada, trilha, rota marítima, rio, fronteira, ferrovia, rota aérea, linha de mana, muralha e viagem do grupo, com seta e animação. Dá para clicar ponto a ponto ou arrastar à mão livre, e o nome pode correr ao longo da rota.
- Regiões e reinos com preenchimento (liso, hachuras, pontos, listras) e borda (tracejada, contínua, pontilhada, brilhante).
- Cada região pode ter **nível de ameaça de viagem** (Livro Básico p. 106: Mínimo d6, Baixo d8, Médio d10, Alto d12, Muito alto d20).

**Em qualquer objeto**
- Nome, nota para todos e nota só do mestre.
- **Diário ligado**: arraste um diário, página, ator, item ou cena para o campo. Arrastar direto para o mapa cria um alfinete ligado.
- **Esconder dos jogadores**: o objeto continua aparecendo, tracejado, só para o mestre.
- Duplicar, frente/trás, enviar ao chat e "mostrar a todos" (leva a vista de todos até ele).
- Desfazer e refazer (Ctrl+Z / Ctrl+Y) enquanto a janela estiver aberta.

## O que os jogadores podem fazer

- Ver o mapa ao vivo: cada mudança do mestre aparece na hora, e o que está escondido não aparece.
- Mover e aproximar a vista.
- Passar o mouse nos lugares para ler nome e nota, e clicar para abrir o diário ligado.
- **Lugares**: lista e busca de tudo que tem nome; clicar leva até o lugar.
- **Régua de dias de viagem**: mostra os dias, os quadrados e a maior ameaça das regiões que cruza.
- **Sinal**: duplo clique no mapa faz um sinal na tela de todos. O mestre pode desligar isso nas configurações do módulo.
- Ler a **Ficha do mundo** e salvar o mapa como imagem PNG.

## Ficha do mundo (página 1 das World Sheets)

- Campos da ficha: nome e formato do mundo, magia e tecnologia, eventos históricos, enigmas e mistérios, ameaças, e países, reinos e nações conhecidos.
- O mestre esconde qualquer parte dos jogadores.
- Botões de inspiração com as tabelas de criação de mundo do Livro Básico (p. 149–151), em paráfrase.

## Escala de viagem

O Livro Básico (p. 149) pede que o grupo defina quanto vale um dia de Viagem no mapa. Em **Mapa > Viagem**, escolha quantos quadrados da grade valem um dia (padrão: 1). A escala do canto e a régua seguem esse valor.

## Atalhos (depois de clicar no mapa)

| Tecla | Ação |
|---|---|
| V H B P T E S N F R G M | Selecionar, mover vista, balde, pincel, textura, borracha, carimbo, nome, efeito, rota, região, régua |
| Roda do mouse / botão do meio ou direito arrastando / Espaço + arrastar | Zoom / mover a vista |
| Del | Apagar a seleção |
| Ctrl+Z / Ctrl+Y | Desfazer / refazer |
| Ctrl+D | Duplicar |
| Setas (Shift = passo maior) | Empurrar a seleção |
| [ ] | Diminuir / aumentar pincel, carimbo ou seleção |
| Enter / Backspace / Esc | Terminar, desfazer ponto ou cancelar rota e região |

## Configurações do módulo

- **Jogadores podem marcar o mapa** (mundo): liga ou desliga o sinal dos jogadores.
- **Animações** (cada computador): completas, reduzidas ou desligadas. Também respeita "reduzir movimento" do sistema.
- **Nitidez da pintura** (cada computador): normal, alta ou máxima.

## Onde os dados ficam

Tudo fica em configurações do mundo: `mapa` (objetos e estilo), `pintura` (pinceladas) e `ficha` (ficha do mundo). Os jogadores conseguem ler, mas não alterar. Como o Foundry envia essas configurações a todos os clientes, um jogador curioso consegue ver no console o que está escondido.

A pintura é guardada como pinceladas, e cada salvamento envia a pintura inteira a todos. Quando ela passar de uns 600 KB, o módulo avisa. Use então **Mapa > Pintura > Consolidar pintura**: ela vira um arquivo WebP em `worlds/<seu-mundo>/mapa-mundi-fu/`, e a lista de pinceladas recomeça vazia. A borracha continua funcionando por cima.

## Créditos

- Os contornos dos dois mapas foram vetorizados das *Fabula Ultima World Sheets*. O módulo não inclui logotipos nem textos da ficha.
- Os carimbos, texturas, temas e efeitos são originais deste módulo.
- *Fabula Ultima* é de Emanuele Galletto / Need Games; a edição brasileira é da Jambô.
- Código sob licença MIT (veja LICENSE).

## Publicar uma versão (manual, no GitHub do rickpigeon)

1. `node build-release.mjs --repo rickpigeon/Mapa-mundi-FU` gera `../mapa-mundi-fu-release-v<versão>/` com `module.json` e `module.zip`.
2. No GitHub, crie a release `v<versão>` (não pré-release) e anexe os dois arquivos.
3. No Foundry, instale pelo link do manifesto: `https://github.com/rickpigeon/Mapa-mundi-FU/releases/latest/download/module.json`.
