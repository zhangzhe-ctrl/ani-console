import clsx from "clsx";
import { useState } from "react";
import DetailInfoCard from "../DetailInfoCard";
import styles from "./index.module.css";
import type { DetailCard } from "..";

type DetailInfoSidebarProps = {
  cards: DetailCard[];
  collapsed: boolean;
};

function buildInitialCollapsed(cardsSignature: string) {
  const cardEntries = JSON.parse(cardsSignature) as Array<[string, boolean]>;
  return Object.fromEntries(cardEntries) as Record<string, boolean>;
}

export default function DetailInfoSidebar({ cards, collapsed }: DetailInfoSidebarProps) {
  const cardsSignature = JSON.stringify(
    cards.map((card) => [card.key, Boolean(card.defaultCollapsed)]),
  );
  const [previousSignature, setPreviousSignature] = useState(cardsSignature);
  const [collapsedCards, setCollapsedCards] = useState(() => buildInitialCollapsed(cardsSignature));

  if (cardsSignature !== previousSignature) {
    setPreviousSignature(cardsSignature);
    setCollapsedCards(buildInitialCollapsed(cardsSignature));
  }

  const expandedCardCount = cards.reduce(
    (count, card) => count + (collapsedCards[card.key] ? 0 : 1),
    0,
  );

  return (
    <aside
      className={clsx(styles.leftPane, collapsed && styles.leftPaneCollapsed)}
      aria-label="详情信息"
    >
      <div className={styles.cardStack}>
        {cards.map((card) => {
          const cardCollapsed = Boolean(collapsedCards[card.key]);
          return (
            <DetailInfoCard
              key={card.key}
              card={card}
              collapsed={cardCollapsed}
              fill={!cardCollapsed && expandedCardCount === 1}
              onToggle={() =>
                setCollapsedCards((current) => ({
                  ...current,
                  [card.key]: !current[card.key],
                }))
              }
            />
          );
        })}
      </div>
    </aside>
  );
}
