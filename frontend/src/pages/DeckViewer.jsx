
import { useEffect, useState } from "react";

import "./DeckViewer.css";

const API_BASE = "";

function DeckViewer({ deckId }) {
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [saving, setSaving] = useState(false);
  const [cardError, setCardError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDeck() {
      try {
        const response = await fetch(`${API_BASE}/decks/${deckId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load deck.");
        }

        if (!cancelled) {
          const sortedCards = [...(data.cards || [])].sort(
            (a, b) => a.index - b.index
          );

          setDeck(data.deck);
          setCards(sortedCards);
          setCurrentIndex(0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDeck();

    return () => {
      cancelled = true;
    };
  }, [deckId]);

  const currentCard = cards[currentIndex];

  const filteredCards = cards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => {
      const query = search.toLowerCase();

      return (
        (card.front || "").toLowerCase().includes(query) ||
        (card.back || "").toLowerCase().includes(query)
      );
    });

  function selectCard(index) {
    setCurrentIndex(index);
    setShowBack(false);
  }

  function goBack() {
    window.location.href = "/dashboard";
  }

  async function handleAddCard(event) {
    event.preventDefault();

    if (!front.trim() || !back.trim()) {
      setCardError("Please enter both sides of the flashcard.");
      return;
    }

    setSaving(true);
    setCardError("");

    try {
      const response = await fetch(`${API_BASE}/decks/${deckId}/cards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          front: front.trim(),
          back: back.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to create flashcard.");
      }

      setCards((previousCards) => [...previousCards, data.card]);
      setCurrentIndex(cards.length);
      setShowBack(false);

      setDeck(data.deck || {
        ...deck,
        numCards: cards.length + 1,
      });

      setFront("");
      setBack("");
      setShowAddForm(false);
      setSearch("");
    } catch (err) {
      setCardError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="deck-page-message">Loading deck...</main>;
  }

  if (error) {
    return (
      <main className="deck-page-message">
        <p>{error}</p>
        <button onClick={goBack}>Back to Dashboard</button>
      </main>
    );
  }

  return (
    <main className="deck-page">
      <header className="deck-page-header">
        <button onClick={goBack} className="deck-back-button">
          ← Dashboard
        </button>

        <div>
          <h1>{deck?.deckName || "Untitled Deck"}</h1>
          <p>{deck?.description || "Study your flashcards."}</p>
        </div>

        <span>{cards.length} cards</span>
      </header>

      <div className="deck-page-content">
        <section className="deck-study-area">
          {currentCard ? (
            <>
              <p className="deck-card-counter">
                Card {currentIndex + 1} of {cards.length}
              </p>

              <button
                className="study-flashcard"
                onClick={() => setShowBack((previous) => !previous)}
              >
                <span className="study-flashcard-label">
                  {showBack ? "BACK" : "FRONT"}
                </span>

                <span className="study-flashcard-text">
                  {showBack
                    ? currentCard.back || "No answer provided"
                    : currentCard.front || "No question provided"}
                </span>

                <span className="study-flashcard-hint">
                  Click to {showBack ? "see question" : "reveal answer"}
                </span>
              </button>

              <div className="deck-card-controls">
                <button
                  onClick={() => selectCard(currentIndex - 1)}
                  disabled={currentIndex === 0}
                >
                  Previous
                </button>

                <button
                  onClick={() => selectCard(currentIndex + 1)}
                  disabled={currentIndex === cards.length - 1}
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <div className="deck-empty-study">
              <h2>No flashcards yet</h2>
              <p>Add your first flashcard using the panel on the right.</p>
            </div>
          )}
        </section>

        <aside className="deck-card-sidebar">
          <div className="deck-sidebar-header">
            <div>
              <h2>Flashcards</h2>
              <p>{cards.length} cards in this deck</p>
            </div>

            <button
              className="add-card-button"
              onClick={() => {
                setShowAddForm((previous) => !previous);
                setCardError("");
              }}
            >
              {showAddForm ? "Cancel" : "+ Add Card"}
            </button>
          </div>

          {showAddForm && (
            <form className="add-card-form" onSubmit={handleAddCard}>
              <h3>New Flashcard</h3>

              <label htmlFor="card-front">Front / Question</label>
              <textarea
                id="card-front"
                placeholder="Enter the question..."
                value={front}
                onChange={(event) => setFront(event.target.value)}
                disabled={saving}
                required
              />

              <label htmlFor="card-back">Back / Answer</label>
              <textarea
                id="card-back"
                placeholder="Enter the answer..."
                value={back}
                onChange={(event) => setBack(event.target.value)}
                disabled={saving}
                required
              />

              {cardError && (
                <p className="add-card-error">{cardError}</p>
              )}

              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Flashcard"}
              </button>
            </form>
          )}

          <input
            className="deck-card-search"
            type="search"
            placeholder="Search cards..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="deck-sidebar-list">
            {filteredCards.map(({ card, index }) => (
              <button
                type="button"
                key={card._id}
                className={`deck-sidebar-card ${
                  currentIndex === index ? "selected" : ""
                }`}
                onClick={() => selectCard(index)}
              >
                <span>Card {index + 1}</span>
                <strong>{card.front || "Empty card"}</strong>
                <small>{card.back || "No answer"}</small>
              </button>
            ))}

            {filteredCards.length === 0 && (
              <p className="deck-sidebar-empty">
                {cards.length === 0
                  ? "No cards yet. Add your first flashcard above."
                  : "No matching cards found."}
              </p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

export default DeckViewer;
