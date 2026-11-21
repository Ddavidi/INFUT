# INFUT — Design System

## 1. Direção
- **Modo:** Operate. É um app de organizar peladas; a pessoa precisa achar status, horário, valor e ação em segundos.
- **Princípio:** cor carrega **significado**, não decoração. A cor da paleta só marca a ação principal, a aba ativa e a seleção. Todo o resto é neutro ou usa uma cor semântica.
- **Assinatura:** números de placar, cronômetro e a marca `INFUT` em **Barlow Condensed** (placar de estádio). O texto corrido usa a fonte do sistema.

## 2. Papéis de cor (valem em todas as paletas)
| Token | Papel | Exemplos |
|---|---|---|
| `primary` / `primarySoft` / `primaryBorder` | Marca e ação principal | Botão principal, aba ativa, chip selecionado, foco |
| `success` | Confirmado, pago, vagas abertas | "Confirmado", "Pago", barra de ocupação |
| `warning` | Pendente, espera, alerta de regra | "Em análise", lista de espera, limite de vitórias |
| `error` | Ao vivo, recusa, destrutivo | "Ao vivo", "Não vou", "Pendente", excluir |
| `info` | Goleiro, informação, próxima pelada | "Semanal", "Próxima Pelada", co-organizador |
| `gold` | MVP, 1º lugar, sequência, organizador | Votos de MVP, líder do ranking |
| `textPrimary/Secondary/Muted` + superfícies | Todo o resto | Voltar, código da pelada, ícones, rótulos |

Cada cor semântica tem `xxxSoft` (fundo) e `xxxBorder` (borda), gerados a partir da cor base.

**Não fazer:** usar `primary` em ícone decorativo, botão "Voltar", código, chevron ou rótulo; borda colorida só de um lado (use borda inteira ou fundo tingido); botão secundário colorido (`outline` é neutro).

## 3. Paletas (Perfil › Aparência)
Definidas em `mobile/src/constants/theme.ts` (`palettes`). A escolha fica salva no aparelho (`infut.palette`).

| id | Nome | Fundo | Primária | Modo |
|---|---|---|---|---|
| `classico` (padrão) | Noite de Jogo | `#0A0D14` azul-marinho | `#FF7A1A` laranja | escuro |
| `canarinho` | Canarinho | `#06111F` azul profundo | `#FFD33D` amarelo | escuro |
| `celeste` | Celeste | `#0C0D10` grafite | `#5AB0FF` azul-celeste | escuro |
| `gramado` | Gramado | `#070A0D` obsidiana | `#16D97C` verde | escuro |
| `dia` | Dia de Jogo | `#F2F3F6` claro | `#C2410C` laranja escuro | claro |

Contraste: texto do botão principal (`textInverse`) ≥ 4.5:1 sobre `primary` em todas as paletas; `textMuted` ≥ 4.5:1 sobre `surface`.

## 4. Como escrever estilos
```ts
import { colors, themed } from '../constants/theme';
const styles = themed(() => StyleSheet.create({ card: { backgroundColor: colors.card } }));
```
`themed` recria o StyleSheet quando a paleta muda. Cores usadas direto no JSX (`color={colors.textPrimary}`) também acompanham, porque o `ThemeProvider` remonta as telas ao trocar a paleta (a navegação mantém a tela atual). Não guarde cores em constantes de módulo fora de `themed`.

## 5. Tipografia
- Texto: fonte do sistema (Segoe UI / SF / Roboto).
- `fonts.display` (Barlow Condensed 600–800, web): placar, cronômetros e marca.
- Pesos: 800 para títulos e números, 700 para títulos de card, 600 para rótulos, 400/500 para texto.
- Números de placar, tempo e dinheiro com `tabular-nums`.

## 6. Espaço, raios e toque
- Grade de 4/8px (`xs 4`, `sm 8`, `md 16`, `lg 24`, `xl 32`, `xxl 48`).
- Raios: cards 16, modais 22, botões e campos 12, chips `full`.
- Alvos de toque com no mínimo 44×44.

## 7. Movimento
- Toque: `ScalePressable` (escala 0.975, 90ms).
- Entrada: `FadeInView` (240ms, sobe 8px; respeita movimento reduzido).
- Ao vivo: `PulseDot` (1400ms).
