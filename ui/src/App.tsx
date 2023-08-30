import React, { useEffect, useState } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { ContextProvider } from "./Context";
import Lookup from "./pages/Lookup";
import Verifier from "./pages/Verifier";
import {configuration} from "./utils/Configuration";

function App() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (process.env.REACT_APP_TAG === "latest") {
      document.title = "(staging) sourcify.eth";
    }
    configuration.readConfig()
        .catch((reason) => {
          console.warn(`Failed to read config: ${reason}`)
        })
        .finally(() => {
          setLoading(false)
        })
  }, []);

  return (
    <div className="flex min-h-screen text-gray-800 bg-gray-50">
        { loading
            ? (<div></div>)
            : (
                <ContextProvider>
                    <HashRouter>
                        <Routes>
                            <Route path="/verifier" element={<Verifier />} />
                            <Route path="/lookup" element={<Lookup />} />
                            <Route path="/lookup/:address" element={<Lookup />} />
                            <Route path="/" element={<Verifier />} />
                        </Routes>
                    </HashRouter>
                </ContextProvider>
            )
        }
    </div>
  );
}

export default App;
