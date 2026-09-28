import React, { useEffect, useState } from "react";
import "../styles/components/TopProgressBar.scss";

const TopProgressBar = ({ loading }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer;

    if (loading) {
      setVisible(true);
      setProgress(0);

      // Smooth progress increment
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev < 90) return prev + Math.random() * 10;
          return prev;
        });
      }, 200);
    } else {
      // Finish bar
      setProgress(100);
      setTimeout(() => setVisible(false), 400);
    }

    return () => clearInterval(timer);
  }, [loading]);

  if (!visible) return null;

  return (
    <div className="top-progress-bar">
      <div className="progress" style={{ width: `${progress}%` }} />
    </div>
  );
};

export default TopProgressBar;
