import React, { useEffect, useRef, useState } from "react";

interface BannerProps {
  text: string;
  speed?: number; // ms per character
}

export const Banner: React.FC<BannerProps> = ({ text, speed = 80 }) => {
  const [displayed, setDisplayed] = useState("");
  const i = useRef(0);

  useEffect(() => {
    setDisplayed("");
    i.current = 0;
    const interval = setInterval(() => {
      i.current++;
      if (i.current <= text.length) {
        setDisplayed(text.substring(0, i.current));
      } else {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  const isTyping = displayed.length < text.length;

  return (
    <div
      style={{
        fontSize: "2rem",
        fontWeight: "bold",
        fontFamily: "monospace",
        lineHeight: "2rem",
      }}
    >
      {displayed}
      {isTyping && <span style={{ opacity: 0.5 }}>|</span>}
    </div>
  );
};
