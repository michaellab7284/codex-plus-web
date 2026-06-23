import { useEffect, useState } from "react";

export function App() {
  const [count, setCount] = useState(0);
  useEffect(() => { document.title = `Count: ${count}`; }, [count]);
  return <div><h1>Codex++ Web</h1><p>Count: {count}</p><button onClick={() => setCount(c+1)}>+</button></div>;
}
