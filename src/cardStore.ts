export type Card = {
  id: number;
  question: string;
  answer: string;
};

let cards: Card[] = [];

export function addCard(question: string, answer: string) {
  cards.push({
    id: Date.now(),
    question,
    answer,
  });
}

export function getCards() {
  return cards;
}