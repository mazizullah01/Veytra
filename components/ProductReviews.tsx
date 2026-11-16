"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/store";
import { adminFetch } from "@/lib/admin-client";

interface Review {
  id: string;
  rating: number;
  body: string;
  created_at: string;
}

export default function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    void fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { reviews?: Review[]; error?: string }) => {
        if (data.reviews) setReviews(data.reviews);
      })
      .catch(() => setError("Unable to load reviews."));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const submit = async () => {
    if (!user) {
      setError("Sign in to leave a review.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await adminFetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify({ productId, rating, body }),
      });
      setBody("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save review.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section section--alt">
      <div className="container">
        <div className="section-head">
          <h2>Reviews</h2>
          <p className="muted">Honest customer feedback used for product health diagnosis.</p>
        </div>
        {reviews.length === 0 ? (
          <p className="muted">No reviews yet.</p>
        ) : (
          <ul className="review-list">
            {reviews.map((review) => (
              <li key={review.id}>
                <strong>★ {review.rating}/5</strong>
                <p>{review.body || "No written review."}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="review-form">
          <h3>Write a review</h3>
          <label className="field">
            <span className="field__label">Rating</span>
            <select className="field__input" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Review</span>
            <textarea
              className="field__input"
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              placeholder="Fit, fabric, quality…"
            />
          </label>
          {error && (
            <p className="field__error" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn btn--solid" disabled={busy} onClick={() => void submit()}>
            <span>{busy ? "Saving…" : "Submit review"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
