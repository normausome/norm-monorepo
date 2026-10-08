export type Lang = "en" | "pt"

export type Axis = "behavior" | "economy"

export type Pole = "left" | "right"

export type Statement = {
  id: string
  pole: Pole
  en: string
  pt: string
}

export type Item = {
  id: string
  axis: Axis
  topic: Record<Lang, string>
  statements: readonly [Statement, Statement]
}

function item(
  id: string,
  axis: Axis,
  topic: Record<Lang, string>,
  left: Omit<Statement, "pole">,
  right: Omit<Statement, "pole">,
): Item {
  return {
    id,
    axis,
    topic,
    statements: [
      { ...left, pole: "left" },
      { ...right, pole: "right" },
    ],
  }
}

export const ITEMS: readonly Item[] = [
  item(
    "guns",
    "behavior",
    { en: "Guns", pt: "Armas" },
    {
      id: "guns-left",
      en: "Possession should be banned because it threatens other people's lives.",
      pt: "A posse deveria ser proibida, porque ameaça a vida de outras pessoas.",
    },
    {
      id: "guns-right",
      en: "Legal ownership should be a citizen's right to self-defense.",
      pt: "A posse legal deveria ser um direito do cidadão à legítima defesa.",
    },
  ),
  item(
    "poverty",
    "behavior",
    { en: "Poverty", pt: "Pobreza" },
    {
      id: "poverty-left",
      en: "Much of it comes from unequal opportunity.",
      pt: "Boa parte dela vem de oportunidades desiguais.",
    },
    {
      id: "poverty-right",
      en: "Much of it comes from laziness of people who do not want to work.",
      pt: "Boa parte dela vem da preguiça de quem não quer trabalhar.",
    },
  ),
  item(
    "crime",
    "behavior",
    { en: "Crime", pt: "Crime" },
    {
      id: "crime-left",
      en: "Crime is caused by lack of opportunity.",
      pt: "O crime é causado pela falta de oportunidade.",
    },
    {
      id: "crime-right",
      en: "Crime is caused by people's malice.",
      pt: "O crime é causado pela maldade das pessoas.",
    },
  ),
  item(
    "death",
    "behavior",
    { en: "Death penalty", pt: "Pena de morte" },
    {
      id: "death-left",
      en: "Justice should not kill, even for grave crimes.",
      pt: "A justiça não deveria matar, nem diante de crimes graves.",
    },
    {
      id: "death-right",
      en: "The death penalty is the best punishment for those crimes.",
      pt: "A pena de morte é a melhor punição para esses crimes.",
    },
  ),
  {
    id: "drugs",
    axis: "behavior",
    topic: { en: "Drugs", pt: "Drogas" },
    statements: [
      {
        id: "drugs-ban",
        pole: "right",
        en: "Drug use should be banned because society suffers.",
        pt: "O uso de drogas deveria ser proibido, porque a sociedade sofre com ele.",
      },
      {
        id: "drugs-user",
        pole: "left",
        en: "Drug use should not be banned because the consequences fall on the user.",
        pt: "O uso de drogas não deveria ser proibido, porque as consequências recaem sobre quem usa.",
      },
    ],
  },
  item(
    "homosexuality",
    "behavior",
    { en: "Homosexuality", pt: "Homossexualidade" },
    {
      id: "homosexuality-left",
      en: "Homosexuality should be accepted by all of society.",
      pt: "A homossexualidade deveria ser aceita por toda a sociedade.",
    },
    {
      id: "homosexuality-right",
      en: "Homosexuality should be discouraged by all of society.",
      pt: "A homossexualidade deveria ser desencorajada por toda a sociedade.",
    },
  ),
  item(
    "god",
    "behavior",
    { en: "God", pt: "Deus" },
    {
      id: "god-left",
      en: "Believing in God does not necessarily make a person better.",
      pt: "Acreditar em Deus não torna, necessariamente, uma pessoa melhor.",
    },
    {
      id: "god-right",
      en: "Believing in God makes people better.",
      pt: "Acreditar em Deus torna as pessoas melhores.",
    },
  ),
  item(
    "unions",
    "behavior",
    { en: "Unions", pt: "Sindicatos" },
    {
      id: "unions-left",
      en: "Unions are important for defending workers.",
      pt: "Os sindicatos são importantes para defender os trabalhadores.",
    },
    {
      id: "unions-right",
      en: "Unions serve more to do politics than to defend workers.",
      pt: "Os sindicatos servem mais para fazer política do que para defender os trabalhadores.",
    },
  ),
  item(
    "teens",
    "behavior",
    { en: "Teen offenders", pt: "Adolescentes infratores" },
    {
      id: "teens-left",
      en: "Teen offenders should be reeducated.",
      pt: "Adolescentes infratores deveriam ser reeducados.",
    },
    {
      id: "teens-right",
      en: "Teen offenders should be punished as adults.",
      pt: "Adolescentes infratores deveriam ser punidos como adultos.",
    },
  ),
  item(
    "immigrants",
    "behavior",
    { en: "Poor immigrants", pt: "Imigrantes pobres" },
    {
      id: "immigrants-left",
      en: "Poor immigrants contribute to the city's development and culture.",
      pt: "Imigrantes pobres contribuem para o desenvolvimento e a cultura da cidade.",
    },
    {
      id: "immigrants-right",
      en: "Poor immigrants create problems for the city.",
      pt: "Imigrantes pobres criam problemas para a cidade.",
    },
  ),
  item(
    "state-role",
    "economy",
    { en: "State role", pt: "Papel do Estado" },
    {
      id: "state-role-left",
      en: "Government should act strongly in the economy to stop company abuses.",
      pt: "O governo deveria agir com força na economia para impedir abusos das empresas.",
    },
    {
      id: "state-role-right",
      en: "The less government interferes, the better.",
      pt: "Quanto menos o governo interferir, melhor.",
    },
  ),
  item(
    "investment",
    "economy",
    { en: "Investment", pt: "Investimento" },
    {
      id: "investment-left",
      en: "Government should be the main driver of investment and growth.",
      pt: "O governo deveria ser o principal motor do investimento e do crescimento.",
    },
    {
      id: "investment-right",
      en: "Private companies should be the main driver of investment and growth.",
      pt: "As empresas privadas deveriam ser o principal motor do investimento e do crescimento.",
    },
  ),
  item(
    "taxes",
    "economy",
    { en: "Taxes", pt: "Impostos" },
    {
      id: "taxes-left",
      en: "Pay more tax and get free public health and education.",
      pt: "Pagar mais imposto e ter saúde e educação públicas gratuitas.",
    },
    {
      id: "taxes-right",
      en: "Pay less tax and buy private services.",
      pt: "Pagar menos imposto e comprar serviços privados.",
    },
  ),
  item(
    "benefits",
    "economy",
    { en: "Benefits", pt: "Benefícios" },
    {
      id: "benefits-left",
      en: "The more government benefits I have, the better my life.",
      pt: "Quanto mais benefícios do governo eu tenho, melhor é a minha vida.",
    },
    {
      id: "benefits-right",
      en: "The less I depend on government, the better my life.",
      pt: "Quanto menos eu dependo do governo, melhor é a minha vida.",
    },
  ),
  item(
    "labor",
    "economy",
    { en: "Labor law", pt: "Legislação trabalhista" },
    {
      id: "labor-left",
      en: "Labor laws protect workers more than they hinder firms.",
      pt: "As leis trabalhistas protegem os trabalhadores mais do que atrapalham as empresas.",
    },
    {
      id: "labor-right",
      en: "Labor laws hinder growth more than they protect workers, so many should be cut.",
      pt: "As leis trabalhistas atrapalham o crescimento mais do que protegem os trabalhadores, então muitas deveriam ser cortadas.",
    },
  ),
  item(
    "bailouts",
    "economy",
    { en: "Bailouts", pt: "Socorro a empresas" },
    {
      id: "bailouts-left",
      en: "Government has a duty to help large national firms at risk of bankruptcy.",
      pt: "O governo tem o dever de ajudar grandes empresas nacionais em risco de falência.",
    },
    {
      id: "bailouts-right",
      en: "Government should not help large national firms at risk of bankruptcy.",
      pt: "O governo não deveria ajudar grandes empresas nacionais em risco de falência.",
    },
  ),
]
