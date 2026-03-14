import { useEffect, useState } from "react";

function App() {
  const [apiStatus, setApiStatus] = useState<string>("checking...");

  useEffect(() => {
    fetch("/api/health/")
      .then((res) => res.json())
      .then((data) => setApiStatus(data.status))
      .catch(() => setApiStatus("unreachable"));
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#141413] mb-4">Funderaise</h1>
        <p className="text-lg text-[#BBB9AF]">
          API Status:{" "}
          <span
            className={
              apiStatus === "ok"
                ? "text-green-600 font-semibold"
                : "text-[#D97757]"
            }
          >
            {apiStatus}
          </span>
        </p>
      </div>
    </div>
  );
}

export default App;
