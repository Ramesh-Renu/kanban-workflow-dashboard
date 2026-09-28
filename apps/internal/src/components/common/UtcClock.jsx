import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

const UtcClock = React.memo(() => {
  const [time, setTime] = useState(dayjs().utc().format("DD-MM-YYYY HH:mm:ss UTC"));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(dayjs().utc().format("DD-MM-YYYY HH:mm:ss UTC"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return <div className="work-allocation-date mb-3">{time}</div>;
});

export default UtcClock;
