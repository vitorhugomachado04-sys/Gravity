# GRAVITY 2.1.1 — A Panorama Arcade Original

Refinamento da engine original: D-pad clássico, malha urbana esférica, passagens por altura, Marte sem pirâmides, nuvens com oclusão espacial, anéis orbitais e combate mais intenso nos dois últimos planetas. Mantém Canvas 2D, projeção esférica, resolução lógica de 240 × 400, roxo `#6A659E` e branco `#FFFFFF`. Sem bibliotecas de execução, backend, instalação ou build.

## Executar no computador

Dentro desta pasta:

```sh
python3 -m http.server 8080 --bind 0.0.0.0
```

Abra http://localhost:8080. `npm start` é uma alternativa caso Node/npm esteja instalado. Módulos JavaScript precisam de HTTP: não use duplo clique em `index.html`. Encerre o servidor com Ctrl+C.

## Testar no celular

1. Conecte computador e celular à mesma rede Wi-Fi.
2. Inicie o servidor acima; permita acesso à rede local se o firewall perguntar.
3. Consulte o IP local do computador nas configurações de Wi-Fi.
4. Abra `http://IP-DO-COMPUTADOR:8080` no Safari/iPhone ou Chrome/Android.
5. Use retrato e toque em START para liberar áudio.

A aba carregada funciona sem conexão. Não há service worker: reabrir/recarregar offline não é garantido. Para publicação, qualquer hospedagem estática pode servir esta pasta.

## Controles e cockpit

- **WASD / setas:** movimento horizontal e altitude limitada.
- **Espaço:** disparo contínuo; **Shift:** um míssil; **Esc:** pausa/retoma.
- **Enter:** inicia/avança nas telas correspondentes.
- **D-pad à esquerda:** quatro direções, diagonais e feedback por direção; centro neutro e liberação ao soltar/cancelar.
- **Retícula à direita:** disparo principal, mantendo pressionado.
- **Símbolo de míssil ao centro-direita:** arma especial. Visor indica munição; traço e borda interrompida indicam zero.
- D-pad, disparo e míssil possuem ponteiros independentes. Área ocupada continua restrita à faixa inferior original.

Obstáculos perigosos têm um **×**. Formações decorativas não causam dano. Na Terra, colisões usam volumes com altura: desça para passar sob pontes (DESCEND / BELOW) e suba para passar sobre estruturas baixas (CLIMB / ABOVE). Tabuleiro e suportes continuam sólidos. Nos demais mundos, desvie lateralmente dos obstáculos físicos. Tiros levam em conta posição lateral, profundidade e altitude.

## Campanha

| Ordem | Fase       | Geometria e identidade                                                                       |
| ----- | ---------- | -------------------------------------------------------------------------------------------- |
| 01    | Moon       | Crateras esparsas sobre a esfera, rochas e pirâmides originais                               |
| 02    | Earth 3027 | Avenidas, cruzamentos, quadras, calçadas, parques, praças e estacionamentos; torres e pontes |
| 03    | Mars       | Mesetas altas, cânions e poucas crateras pequenas, sem pirâmides lunares                     |
| 04    | Neptune    | Pontilhado preservado, nuvens em várias alturas, antenas e formações atiradoras              |
| 05    | Saturn     | Atmosfera limpa, sem obstáculos físicos; arcos orbitais gigantescos e combate intenso        |

Cada fase tem 2.400 unidades de percurso, aproximadamente 88–96 segundos. Depois de Stage Clear, toque em **PRÓXIMO**. Pontuação, vidas, mísseis e arma são preservados. Escudo e invulnerabilidade temporários expiram na transição. Ao repetir uma fase, o estado volta ao momento de entrada, inclusive pontuação e equipamentos, evitando duplicar bônus. Após Saturno, **NOVA EXPEDIÇÃO** começa novamente na Lua. O checkpoint vive apenas na sessão; não há save de campanha entre recarregamentos.

Os quatro comportamentos inimigos são Scout, Zigzag, Shooter e Satellite. O Satellite mantém as asas laterais e movimento oscilante; agora recebe dano, tem 2 HP, concede 200 pontos e continua causando dano em colisões válidas.

## Power-ups

A lógica de coleta foi preservada; as cápsulas usam silhuetas pixeladas:

- **Double:** dois projéteis paralelos.
- **Triple:** três projéteis paralelos.
- **Wide:** disparos em leque.
- **Rapid:** sequência escalonada de tiros.
- **Missile:** míssil com aletas, adiciona três unidades.
- **Shield:** escudo geométrico, proteção de nove segundos.

Os nomes continuam aparecendo no aviso de coleta. Upgrades não rebaixam a arma. Há três vidas iniciais e 2,3 segundos de invulnerabilidade após dano. Recorde e áudio persistem localmente; armazenamento indisponível não impede o jogo.

## Correções investigadas

**Crateras:** antes eram elipses de tela ancoradas em um único ponto. Agora cada vértice do contorno é projetado na esfera, com oclusão no horizonte e recorte nas bordas. A distribuição usa posições absolutas, sem a antiga repetição a cada 400 unidades. O gerador limita a faixa lateral, reduz a densidade e verifica distância geodésica e raio real das formações. Se uma cratera perigosa planejada conflitar com o cenário, aquela formação usa a rocha existente. O centro visual de crateras pode alinhar-se por perspectiva, mas os seus terrenos não se intersectam.

**Nave de asas laterais:** era o `satellite`, classificado como obstáculo de vida infinita. Como tiros só atingiam `kind: enemy`, ele nunca recebia dano. Foi reclassificado sem mudar seu sprite/movimento. Também foi implementado teste de colisão contínua relativo ao movimento do alvo nas três coordenadas, com hitboxes explícitas por modelo e impacto visual. Não houve redução do HP dos três inimigos anteriores.

**Geometria alta:** a oclusão considera altura radial; edifícios podem surgir pelo topo antes de suas bases. Faces são recortadas contra a esfera e rasterizadas em pixels inteiros. A câmera e a curvatura permanecem compartilhadas entre todos os planetas.

## Refinamentos desta atualização

- Lua: crateras decorativas na faixa central ±26, raio 4–7, separação geodésica e menos candidatos; projeção por vértices e pirâmides preservadas.
- Terra: ruas amostradas nas coordenadas reais da esfera. Edifícios ocupam quadras; torres de até 78 unidades e construções menores variam a escala. Ponte e estrutura baixa compartilham a mesma geometria entre desenho e colisão contínua.
- Marte: mesetas e cânions com bordas geológicas; crateras ocasionais de raio 2,8–4 afastadas das formações. Rochas perigosas usam blocos, sem o sprite de pirâmide lunar.
- Netuno: camadas de nuvens com movimento suave, alturas 18/25/32 e névoa em dithering. A ocultação decorre da interseção do raio câmera/nave com a nuvem. Indicadores de posição e ameaças continuam legíveis; antenas afuniladas substituem raios.
- Saturno: nenhum objeto de superfície. Anéis são círculos em um plano orbital centrado no planeta, projetados pela câmera e ocultados pela esfera. Só arcos parciais entram na tela.
- Combate: formações de 2–3 atiradores em Netuno e 3–4 em Saturno, padrões variados, aviso antes do tiro e intervalos maiores a cada quatro ondas. Disparos mirados não perseguem após o lançamento. Cada grupo reserva um corredor; o balanceamento entre grupos ainda requer playtest humano.
- Limites: 18 inimigos, 48 projéteis hostis e 160 partículas. Velocidade planetária, armas, áudio, power-ups e progressão preservados.

## Arquivos

| Arquivo                                | Responsabilidade                                                    |
| -------------------------------------- | ------------------------------------------------------------------- |
| `index.html`, `style.css`, `title.svg` | Interface, cockpit, layout/safe areas e título preservado           |
| `js/main.js`                           | Entrada da aplicação                                                |
| `js/app.js`                            | Loop, telas, pausa, cockpit e persistência                          |
| `js/config.js`                         | Paleta, câmera, resolução, limites e parâmetros base da Lua         |
| `js/stages.js`                         | Registro modular dos cinco planetas                                 |
| `js/campaign.js`                       | Avanço, checkpoint de entrada e reinício                            |
| `js/urban.js`                          | Malha urbana, quadras, volumes compartilhados e colisões por altura |
| `js/atmosphere.js`                     | Nuvens, movimento e interseção espacial da névoa                    |
| `js/encounters.js`                     | Formações, padrões de ataque e limites de combate                   |
| `js/rings.js`                          | Geometria orbital centrada em Saturno                               |
| `js/world.js`                          | Simulação, nave, formação de ondas, armas, bônus e pontuação        |
| `js/combat.js`                         | HP/pontos/hitboxes e colisão contínua relativa                      |
| `js/projection.js`                     | Projeção, oclusão, inversa e recorte de linhas                      |
| `js/scenery.js`                        | Distribuição determinística, espaçamento e geometria de cenário     |
| `js/planets.js`                        | Renderização de torres, mesetas, nuvens, antenas e anéis            |
| `js/render.js`                         | Terreno, sprites, crateras, partículas e HUD                        |
| `js/icons.js`, `assets/*.svg`          | Silhuetas dos bônus e controles, em duas cores                      |
| `js/font.js`                           | Texto bitmap do canvas                                              |
| `js/input.js`, `js/audio.js`           | Teclado/multitoque e áudio sintetizado                              |
| `tests/*.test.js`                      | Regressão de lógica, entrada, projeção e campanha                   |
| `tests/visual.html`, `tests/visual.js` | Cenas controladas e validação de paleta                             |
| `tests/campaign.html`                  | Interface real com fases curtas para testar transições              |
| `package.json`, `NOTICE.md`            | Comandos opcionais e licença ainda pendente                         |

## Testes reproduzíveis

Com Node.js 20 ou superior:

```sh
node --test tests/*.test.js
```

Ou `npm test`. Nenhum pacote precisa ser instalado.

No navegador, com o servidor ativo:

- `http://localhost:8080/tests/visual.html`: inspecione cada planeta, crateras laterais, seis ícones, destruição do Satellite e use **Validar 5 cenários**. O teste desenha seis distâncias por planeta e lê os pixels para verificar a paleta. Mede tempo de render, não FPS de uma partida.
- `http://localhost:8080/tests/campaign.html`: usa a mesma aplicação, com fases de 20 unidades, exclusivamente para avançar rapidamente pelos diálogos e checkpoints. Seu recorde usa uma chave de teste separada. Não testa dificuldade nem substitui uma partida normal.

### Validação realizada nesta entrega

- **40 testes automatizados aprovados**: regressões de tiros, dano, mísseis, power-ups, progressão e projeção; D-pad diagonal/multitoque simulado; quadras e passagens por altura, inclusive dano na simulação real; crateras e geologia; nuvens; anéis; limites do combate.
- Cinco fases completas simuladas com escudo de teste: verifica estabilidade/transições, não dificuldade humana. Nas amostras de combate passivo, picos de 8 inimigos/16 projéteis em Netuno e 12/18 em Saturno. Oclusão contínua central máxima de aproximadamente 0,58 segundo na amostra de Netuno; posições distintas podem variar.
- Inspeção dos cenários no navegador integrado: ruas curvas, ponte com vão, Marte sem pirâmides, névoa com ameaça legível e anéis parciais de Saturno.
- Progressão pela interface real em fases curtas: Moon → Earth → Mars → Neptune → Saturn → All Clear. Recorde de teste separado.
- D-pad verificado em viewports 390 × 844 e 320 × 568, sem rolagem. Em 390: área de toque do direcional ~117 × 89 px, míssil ~84 × 80, disparo ~106 × 88. Em 320: ~96 × 73, ~69 × 65, ~87 × 72. Pausa confirmada. Isso é teste responsivo de navegador, não aparelho físico.
- Paleta conferida em 30 quadros, seis posições por planeta: exatamente roxo e branco opacos. Cena adicional com névoa também passou.
- Render isolado dos cenários: máximos locais de 4,9 ms (Moon), 9,4 ms (Earth), 4,0 ms (Mars), 6,6 ms (Neptune), 3,7 ms (Saturn). Cena de névoa sobre a nave: 30 renders, média 6,9 ms, pico 32,9 ms. Não é benchmark sustentado; **60 FPS em celular ainda não está comprovado**.
- Nenhum erro/aviso de console observado nas cenas inspecionadas.

A página `tests/visual.html` também oferece **Nuvem sobre a nave**, **Passagem inferior** e **Passagem superior** para reproduzir esses casos. As medições incluem atualização forçada do terreno em cada render e variam com o dispositivo.

### Validação manual necessária em iPhone/Android

Não houve acesso a aparelhos físicos nesta entrega.

1. Segure uma diagonal do D-pad e o disparo simultaneamente; toque no míssil com um terceiro dedo. A nave deve continuar movendo/disparando sem interrupção.
2. Solte cada dedo fora da área do controle. D-pad deve neutralizar e tiro deve parar. Cancelar um gesto não pode prender o comando.
3. Gaste três mísseis: visor 03 → 02 → 01 → 00. Em zero, o botão deve mudar visualmente e não lançar. Colete munição e confirme reativação.
4. Alterne aplicativo/aba e bloqueie o aparelho. A partida deve pausar e só continuar por ação explícita.
5. Gire/redimensione, volte ao retrato e verifique safe areas, alvos de toque, ausência de rolagem e visibilidade da nave.
6. Passe pelos cinco mundos, testando precisão dos tiros e desvios. Confira transições, Game Over, repetição de fase e nova expedição.
7. Na Terra, passe sob pontes em altitude baixa e sobre blocos em altitude alta; repita na altura errada para confirmar dano. Observe se os avisos dão tempo suficiente para reagir.
8. Em Netuno, atravesse nuvens movendo-se lateralmente; confirme reaparecimento natural, ameaça legível e controle contínuo. Em Saturno, verifique os corredores entre salvas, intervalos e ausência de obstáculos físicos.
9. Verifique áudio no Safari/Chrome e desempenho sustentado em aparelho intermediário. Ajuste densidade/efeitos apenas se a medição indicar necessidade.

## Modificar / expandir

Adicione uma definição em `stages.js`, um gerador de geometria em `scenery.js` e, quando necessário, um desenho em `planets.js`. Os sistemas de armas, controles e campanha continuam compartilhados. `s` é distância absoluta, `x` arco lateral e `h` altura radial; a câmera usa `s - distance`. Não use posições de tela para colisões.

O loop mantém passo fixo de 1/60 s; frames acima de 100 ms são limitados para evitar saltos. Terreno é atualizado a cada dois frames; os demais elementos, a cada frame. O cenário usa sementes reproduzíveis e só desenha a região próxima. Elementos altos recebem margem de distância para emergir naturalmente antes da base.

As faces, linhas, sprites e alfabeto do canvas são rasterizados em pixels inteiros. Texto HTML dos menus e contornos CSS podem receber suavização pelo navegador, sem cores adicionais declaradas na identidade.

O áudio continua sintetizado. `AudioSystem.setTrack(url)` aceita uma futura trilha original local. Nenhum asset de franquias externas foi incorporado.

## Próximos ajustes recomendados

Priorizar playtests físicos e balanceamento da campanha completa. A arquitetura está funcional, mas o ajuste de densidade de edifícios/nuvens, hitboxes percebidas e dificuldade acumulada deve ser orientado por jogadores. A trilha ainda é provisória. Não foram adicionados narrativa, multiplayer, câmera alternativa, suporte específico a gamepad ou serviços online.

Licença do código e uso da marca continuam pendentes da Panorama; consulte `NOTICE.md`.

Arquivos alterados na 2.1: `index.html`, `style.css`, `package.json`, este README; `js/input.js`, `scenery.js`, `stages.js`, `world.js`, `render.js`, `planets.js`, `projection.js`; os quatro módulos novos listados acima; testes de entrada/campanha, `refinement-general.test.js` e páginas de verificação. `app.js`, `campaign.js`, `audio.js` e os modelos de armas foram preservados.

## Patch 2.1.1 — pontes e cheats

A ponte agora sobrepõe a nave somente nas faces que estão à frente dela na câmera. O recorte usa a profundidade projetada da geometria original; não altera a colisão nem preenche o vão. Inspeção visual confirmou ocultação durante a passagem e reaparecimento depois, com três vidas preservadas.

Digite no teclado, sem Enter, ou use o campo **CÓDIGO** no menu/tela de pausa e toque em **IR**:

| Código | Destino |
|---|---|
| expedition1 | Moon |
| expedition2 | Earth 3027 |
| expedition3 | Mars |
| expedition4 | Neptune |
| expedition5 | Saturn |

Cada código começa a fase escolhida com o equipamento inicial, três vidas e pontuação zero. A progressão segue normalmente a partir dela. Maiúsculas também são aceitas. No teclado, intervalos acima de cinco segundos reiniciam a sequência. No celular, pause para acessar o campo sem movimentar a nave enquanto digita.

43 testes automatizados aprovados. Testados na interface: expedition2 pelo campo, expedition5 pelo teclado e layout do campo em 320 × 568. Sem teste em aparelho físico nesta entrega.

Arquivos do patch: `js/planets.js`, `render.js`, `campaign.js`, `input.js`, `app.js`, novo `cheats.js`; `index.html`, `style.css`, `package.json`, este README; `tests/cheats-bridge.test.js`, `tests/visual.js` e `tests/campaign.html`.

O projeto permanece local, sem publicação. Para usar no celular, mantenha o servidor ligado no Mac e abra `http://IP-DO-MAC:8080` na mesma rede. O IP pode mudar. Para iniciar novamente, abra o Terminal nesta pasta e execute `python3 -m http.server 8080 --bind 0.0.0.0`.
