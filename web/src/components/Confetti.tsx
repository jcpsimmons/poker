import { useEffect, useState } from "react";
import ReactConfetti from "react-confetti";
import { usePoker } from "../contexts/PokerContext";

export const Confetti = () => {
  const { gameState } = usePoker();
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (gameState.revealed && gameState.votes.length >= 2) {
      // Check for consensus (all votes within 2 points)
      const points = gameState.votes
        .map((v) => parseInt(v.points))
        .filter((p) => !isNaN(p) && p > 0);

      if (points.length >= 2) {
        const min = Math.min(...points);
        const max = Math.max(...points);
        
        if (max - min <= 2) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000);
        }
      }
    }
  }, [gameState.revealed, gameState.votes]);

  if (!showConfetti) return null;

  return (
    <ReactConfetti
      width={windowSize.width}
      height={windowSize.height}
      recycle={false}
      numberOfPieces={500}
      colors={['#FF6B9D', '#C084FC', '#FFA500', '#4ADE80', '#60A5FA']}
    />
  );
};

