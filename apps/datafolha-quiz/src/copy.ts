import type { Lang } from "@/quiz/items"

export type Copy = {
  kicker: string
  title: string
  lede: string
  scale: string
  start: string
  agree: string
  back: string
  next: string
  seeResults: string
  retake: string
  change: string
  selected: string
  progress: (current: number, total: number) => string
  jump: (n: number) => string
  behavior: string
  economy: string
  overall: string
  progressive: string
  conservative: string
  state: string
  market: string
  left: string
  right: string
  context: string
  footerBefore: string
  footerBetween: string
  footerAnd: string
  footerAfter: string
  globe: string
  meio: string
  compass: string
  values: string
  plotCaption: string
  plotLabel: (economy: number, behavior: number) => string
  language: string
  answerAll: string
}

const links = {
  globe: "O Globo Teste Ideológico",
  meio: "Canal Meio Painel Ideológico",
  compass: "Political Compass",
  values: "8values BR",
}

export const COPY: Record<Lang, Copy> = {
  en: {
    kicker: "Datafolha",
    title: "Two-axis alignment",
    lede: "Sixteen forced choices. Ten are about behavior and six are about the economy. Pick the statement you agree with more. There is no middle option.",
    scale:
      "Each axis is a score from 0 to 100. The number is the share of answers on the conservative pole for behavior, or the market pole for economy. Overall is the mean of the two axis scores, so the axes have equal weight.",
    start: "Start",
    agree: "Which statement do you agree with more?",
    back: "Back",
    next: "Next",
    seeResults: "See results",
    retake: "Retake",
    change: "Change answers",
    selected: "Selected",
    progress: (current, total) => `Question ${current} of ${total}`,
    jump: (n) => `Question ${n}`,
    behavior: "Behavior",
    economy: "Economy",
    overall: "Overall",
    progressive: "Progressive",
    conservative: "Conservative",
    state: "State",
    market: "Market",
    left: "Left",
    right: "Right",
    context:
      "Datafolha found the evangelical gap is widest on behavior items (guns, homosexuality, God, crime, teen punishment) and near the national average on economy.",
    footerBefore: "Not Datafolha's official questionnaire. For comparison try ",
    footerBetween: ", ",
    footerAnd: ", ",
    footerAfter: ".",
    ...links,
    plotCaption: "Horizontal axis is economy. Vertical axis is behavior.",
    plotLabel: (economy, behavior) =>
      `Your position. Economy ${economy} toward market. Behavior ${behavior} toward conservative.`,
    language: "Language",
    answerAll: "Answer all 16 items before the results.",
  },
  pt: {
    kicker: "Datafolha",
    title: "Alinhamento em dois eixos",
    lede: "Dezesseis escolhas forçadas. Dez são de comportamento e seis de economia. Escolha a frase com a qual você concorda mais. Não há opção do meio.",
    scale:
      "Cada eixo vai de 0 a 100. O número é a parcela das respostas no polo conservador do comportamento, ou no polo de mercado da economia. A nota geral é a média dos dois eixos, com o mesmo peso para cada um.",
    start: "Começar",
    agree: "Com qual frase você concorda mais?",
    back: "Voltar",
    next: "Avançar",
    seeResults: "Ver resultado",
    retake: "Refazer",
    change: "Mudar respostas",
    selected: "Escolhida",
    progress: (current, total) => `Pergunta ${current} de ${total}`,
    jump: (n) => `Pergunta ${n}`,
    behavior: "Comportamento",
    economy: "Economia",
    overall: "Geral",
    progressive: "Progressista",
    conservative: "Conservador",
    state: "Estado",
    market: "Mercado",
    left: "Esquerda",
    right: "Direita",
    context:
      "O Datafolha viu que a diferença dos evangélicos é maior nas questões de comportamento (armas, homossexualidade, Deus, crime e punição de adolescentes) e fica perto da média nacional na economia.",
    footerBefore:
      "Não é o questionário oficial do Datafolha. Para comparar, experimente ",
    footerBetween: ", ",
    footerAnd: " e ",
    footerAfter: ".",
    ...links,
    plotCaption: "O eixo horizontal é a economia. O eixo vertical é o comportamento.",
    plotLabel: (economy, behavior) =>
      `Sua posição. Economia ${economy} na direção do mercado. Comportamento ${behavior} na direção conservadora.`,
    language: "Idioma",
    answerAll: "Responda as 16 perguntas antes do resultado.",
  },
}

export const COMPARE = {
  globe: "https://infograficos.oglobo.globo.com/politica/eleicoes-2026/direita-centro-esquerda-quiz-perfil-ideologico.html",
  meio: "https://canalmeio.com.br/painel-ideologico",
  compass: "https://politicalcompass.org/test",
  values: "https://testepolitico.com.br",
} as const
